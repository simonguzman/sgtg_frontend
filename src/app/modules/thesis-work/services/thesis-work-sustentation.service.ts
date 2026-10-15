import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { CalificacionApi, TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { UserService } from '../../users/services/user.service';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/** Documentos de la solicitud de sustentación (entrega final). */
export interface SustentationRequestFiles {
  monograph: File;
  formatE: File;
  pazYSalvo: File;
  /** Obligatorio en práctica profesional */
  advisorConcept?: File | null;
  annexes?: File | null;
}

/** Programación de una sesión por el Consejo. */
export interface SustentationSchedule {
  coordinatorId: string;
  jurorId: string;
  /** Fecha y hora local, ej. `2026-07-15T14:00:00` */
  dateTime: string;
  location: string;
  formatE: File;
}

/**
 * Sustentación contra el backend: la solicita el director, la programa el
 * Consejo con un jurado coordinador, la califica el coordinador (con el acta)
 * o registra la inasistencia; el director radica los ajustes y el coordinador
 * los verifica y carga la versión definitiva. El otro jurado solo consulta.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkSustentationService {
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Solicitud de sustentación del director (entrega final). */
  requestSustentation(thesisWorkId: string, files: SustentationRequestFiles): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarArchivos(thesisWorkId, 'sustentacion', null, {
      monografia: files.monograph, documentoFinal: files.formatE, pazYSalvo: files.pazYSalvo,
      conceptoAsesor: files.advisorConcept, anexos: files.annexes
    }), AppEventType.THESIS_FINAL_DELIVERY_UPLOADED, true);
  }

  /**
   * Programación del Consejo (primera o segunda sesión), con el formato E. El
   * backend asigna los roles de jurado; los jurados los ven al iniciar sesión.
   */
  scheduleSustentation(thesisWorkId: string, schedule: SustentationSchedule): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarArchivos(thesisWorkId, 'sustentacion/programacion', {
      juradoCoordinadorId: Number(schedule.coordinatorId), juradoId: Number(schedule.jurorId),
      fechaHora: schedule.dateTime, salon: schedule.location
    }, { archivo: schedule.formatE }), AppEventType.THESIS_SUSTENTATION_PROGRAMMED, false, [
      schedule.coordinatorId, schedule.jurorId
    ]);
  }

  /** Calificación del jurado coordinador con el acta (formato G). */
  gradeSustentation(thesisWorkId: string, grade: CalificacionApi, observations: string,
    record: File): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarArchivos(thesisWorkId, 'sustentacion/calificaciones',
      { calificacion: grade, observaciones: observations.trim() || null }, { archivo: record }),
      AppEventType.THESIS_VERDICT_REGISTERED);
  }

  /** Inasistencia del estudiante, registrada por el jurado coordinador. */
  registerNonAttendance(thesisWorkId: string, observations: string): Observable<ThesisWork> {
    return this.operar(thesisWorkId,
      this.api.enviarJson(thesisWorkId, 'sustentacion/inasistencia', { observaciones: observations.trim() }),
      AppEventType.THESIS_VERDICT_REGISTERED);
  }

  /** Ajustes del director (aprobada con observaciones), con anexos opcionales. */
  submitAdjustments(thesisWorkId: string, adjustments: File, annexes?: File | null): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarArchivos(thesisWorkId, 'sustentacion/ajustes', null,
      { archivo: adjustments, anexos: annexes }), AppEventType.THESIS_CORRECTED_DOCUMENTS_UPLOADED);
  }

  /** Verificación de los ajustes por el jurado coordinador. */
  verifyAdjustments(thesisWorkId: string, fulfills: boolean, observations: string): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarJson(thesisWorkId, 'sustentacion/ajustes/verificaciones',
      { cumple: fulfills, observaciones: observations.trim() || null }),
      AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED);
  }

  /** Versión definitiva (formato H) del jurado coordinador: el trabajo finaliza. */
  uploadFinalVersion(thesisWorkId: string, document: File): Observable<ThesisWork> {
    return this.operar(thesisWorkId, this.api.enviarArchivos(thesisWorkId, 'sustentacion/version-definitiva', null,
      { archivo: document }), AppEventType.THESIS_CORRESPONDENCE_REGISTERED);
  }

  /** Actualiza el almacén con la respuesta y notifica a los participantes (y al Consejo o los jurados). */
  private operar(thesisWorkId: string, peticion: Observable<TrabajoGradoResponse>, evento: AppEventType,
    incluirConsejo = false, adicionales: string[] = []): Observable<ThesisWork> {
    return peticion.pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo)),
      tap(thesisWork => this.eventBus.emit({
        type: evento,
        targetUserIds: this.destinatarios(thesisWork, incluirConsejo, adicionales),
        payload: {
          thesisId: thesisWorkId,
          thesisWorkId,
          thesisTitle: thesisWork.preliminaryDraftData?.proposalData?.title ?? ''
        }
      }))
    );
  }

  private vista(trabajo: TrabajoGradoResponse): ThesisWork {
    const thesisWork = aTrabajoDeGrado(trabajo, this.vistas.contexto());
    if (!thesisWork) throw new Error('El trabajo de grado no está en curso.');
    return thesisWork;
  }

  private destinatarios(thesisWork: ThesisWork, incluirConsejo: boolean, adicionales: string[]): string[] {
    const ids = [...collectParticipantIds(thesisWork.preliminaryDraftData?.proposalData), ...adicionales,
      ...(thesisWork.sustentation?.jurorIds ?? [])];
    if (incluirConsejo) {
      ids.push(...this.userService.users().filter(u => u.roles.includes(UserRoleType.CONSEJO)).map(u => u.id));
    }
    return [...new Set(ids)];
  }
}
