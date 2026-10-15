import { computed, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { TrabajoGradoApiService } from './trabajo-grado-api.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { TrabajoGradoResponse } from '../../interfaces/api/trabajo-grado-api.interface';

/** Roles que consultan todos los trabajos (los demás solo ven en los que participan). */
export const ROLES_CONSULTA_GENERAL: readonly UserRoleType[] = [
  UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO,
  UserRoleType.DECANATURA
];

/**
 * Trabajos de grado del backend en memoria. Es la fuente de las vistas de
 * propuesta, anteproyecto y trabajo de grado: cada vista se construye desde
 * el mismo trabajo con `core/mappers/trabajo-grado.mapper.ts`.
 *
 * Se carga al iniciar sesión (o al abrir la aplicación con sesión) y se vacía
 * al cerrarla. Cada operación del backend devuelve el trabajo actualizado,
 * que se reemplaza con {@link upsert}.
 */
@Injectable({ providedIn: 'root' })
export class TrabajoGradoStoreService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly authStorage = inject(AuthStorageService);

  private readonly _trabajos = signal<TrabajoGradoResponse[]>([]);
  private readonly _cargado = signal(false);

  /** Trabajos visibles para el usuario, del más reciente al más antiguo. */
  readonly trabajos = this._trabajos.asReadonly();
  /** true cuando terminó la primera carga desde el backend. */
  readonly cargado = this._cargado.asReadonly();
  readonly porId = computed(() => new Map(this._trabajos().map(trabajo => [String(trabajo.id), trabajo])));

  constructor() {
    let autenticadoAntes = false;
    effect(() => {
      const autenticado = this.authStorage.isAuthenticated();
      untracked(() => {
        if (autenticado && !autenticadoAntes) this.cargar().subscribe();
        if (!autenticado && autenticadoAntes) this.limpiar();
      });
      autenticadoAntes = autenticado;
    });
  }

  /** @returns true si el usuario en sesión consulta todos los trabajos */
  tieneConsultaGeneral(): boolean {
    const roles = this.authStorage.userRoles();
    return ROLES_CONSULTA_GENERAL.some(rol => roles.includes(rol));
  }

  /**
   * Carga (o recarga) la lista: todos los trabajos para los roles de consulta
   * general, los propios para los demás. Un error deja la lista como estaba.
   */
  cargar(): Observable<TrabajoGradoResponse[]> {
    const consulta = this.tieneConsultaGeneral() ? this.api.todos() : this.api.misTrabajos();
    return consulta.pipe(
      tap(trabajos => {
        this._trabajos.set(trabajos);
        this._cargado.set(true);
      }),
      catchError(error => {
        console.warn('No se pudieron cargar los trabajos de grado', error?.status);
        this._cargado.set(true);
        return of(this._trabajos());
      })
    );
  }

  /** Busca un trabajo en memoria; si no está, lo consulta al backend. */
  obtener(id: string | number): Observable<TrabajoGradoResponse | undefined> {
    const enMemoria = this.porId().get(String(id));
    if (enMemoria) return of(enMemoria);
    return this.api.consultar(id).pipe(
      tap(trabajo => this.upsert(trabajo)),
      map(trabajo => trabajo as TrabajoGradoResponse | undefined),
      catchError(() => of(undefined))
    );
  }

  /** Agrega o reemplaza un trabajo (respuesta de una operación del backend). */
  upsert(trabajo: TrabajoGradoResponse): void {
    this._trabajos.update(lista => lista.some(t => t.id === trabajo.id)
      ? lista.map(t => t.id === trabajo.id ? trabajo : t)
      : [trabajo, ...lista]);
  }

  private limpiar(): void {
    this._trabajos.set([]);
    this._cargado.set(false);
  }
}
