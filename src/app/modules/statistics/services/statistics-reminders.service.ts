import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { catchError, from, map, mergeMap, Observable, of, toArray } from 'rxjs';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { apiErrorMessage } from '../../../core/utils/api-error.utils';
import { RawProjectData } from '../interfaces/rawProjectData.interface';

/** Roles que envían el recordatorio de entrega (el backend valida el departamento del Comité y del jefe) */
export const ROLES_RECORDATORIO: UserRoleType[] = [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO,
  UserRoleType.DECANATURA, UserRoleType.COMITE, UserRoleType.JEFE_DEP];

/** Roles que abren el detalle de un trabajo de grado (las mismas rutas del módulo) */
const ROLES_DETALLE_TRABAJO: UserRoleType[] = [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR,
  UserRoleType.CODIRECTOR, UserRoleType.ASESOR, UserRoleType.DECANATURA, UserRoleType.CONSEJO, UserRoleType.JURADO,
  UserRoleType.COMITE];

/** Texto con el que el backend rechaza un segundo recordatorio el mismo día */
const YA_RECORDADO = 'Ya se envió hoy';

type ResultadoRecordatorio = 'enviado' | 'ya-recordado' | 'error';

/**
 * Recordatorio manual de la entrega a los trabajos próximos a vencer: el backend
 * notifica a los estudiantes y a la dirección (una vez por trabajo al día).
 */
@Injectable({ providedIn: 'root' })
export class StatisticsRemindersService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly authStorage = inject(AuthStorageService);
  private readonly notification = inject(NotificationService);

  readonly canRemind = computed(() => ROLES_RECORDATORIO.some(rol => this.authStorage.userRoles().includes(rol)));
  readonly canOpenDetails = computed(() =>
    ROLES_DETALLE_TRABAJO.some(rol => this.authStorage.userRoles().includes(rol)));

  /** Trabajos con un recordatorio en camino (su botón se deshabilita) */
  readonly sending = signal<ReadonlySet<string>>(new Set());
  /** Trabajos ya recordados hoy en esta sesión */
  readonly reminded = signal<ReadonlySet<string>>(new Set());

  remind(project: RawProjectData): void {
    if (this.sending().has(project.id)) return;
    this.enviar(project).subscribe(resultado => {
      if (resultado === 'enviado') {
        this.notification.success('Recordatorio enviado',
          `Se notificó a los estudiantes y a la dirección de "${project.title}" que se acerca su fecha de entrega.`);
      } else if (resultado === 'ya-recordado') {
        this.notification.info('Ya se recordó hoy', `El recordatorio de "${project.title}" ya se envió hoy.`);
      }
    });
  }

  /** Envía el recordatorio a todos los trabajos que aún no se han recordado hoy (de a tres a la vez). */
  remindAll(projects: RawProjectData[]): void {
    const pendientes = projects.filter(project => !this.reminded().has(project.id) && !this.sending().has(project.id));
    if (pendientes.length === 0) {
      this.notification.info('Sin recordatorios pendientes', 'Todos los trabajos de la lista ya se recordaron hoy.');
      return;
    }
    from(pendientes).pipe(mergeMap(project => this.enviar(project), 3), toArray()).subscribe(resultados => {
      const enviados = resultados.filter(r => r === 'enviado').length;
      const repetidos = resultados.filter(r => r === 'ya-recordado').length;
      const fallidos = resultados.filter(r => r === 'error').length;
      const partes = [`Se envió el recordatorio a ${enviados} ${enviados === 1 ? 'trabajo' : 'trabajos'}`];
      if (repetidos) partes.push(`${repetidos} ya se ${repetidos === 1 ? 'había' : 'habían'} recordado hoy`);
      if (fallidos) partes.push(`${fallidos} no se ${fallidos === 1 ? 'pudo' : 'pudieron'} enviar`);
      const mensaje = partes.join('; ') + '.';
      if (fallidos) this.notification.error('Recordatorios enviados con errores', mensaje);
      else this.notification.success('Recordatorios enviados', mensaje);
    });
  }

  private enviar(project: RawProjectData): Observable<ResultadoRecordatorio> {
    this.sending.update(ids => new Set(ids).add(project.id));
    return this.api.enviarJson(project.id, 'recordatorio-entrega', {}).pipe(
      map(trabajo => {
        this.store.upsert(trabajo);
        return 'enviado' as const;
      }),
      catchError((error: unknown) => {
        const mensaje = apiErrorMessage(error, 'No se pudo enviar el recordatorio.');
        if (error instanceof HttpErrorResponse && error.status === 400 && mensaje.includes(YA_RECORDADO)) {
          return of('ya-recordado' as const);
        }
        this.notification.error('No se envió el recordatorio', `"${project.title}": ${mensaje}`);
        return of('error' as const);
      }),
      map(resultado => {
        this.sending.update(ids => { const copia = new Set(ids); copia.delete(project.id); return copia; });
        if (resultado !== 'error') this.reminded.update(ids => new Set(ids).add(project.id));
        return resultado;
      })
    );
  }
}
