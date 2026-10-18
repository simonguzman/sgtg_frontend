import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { CalificacionApi, TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';

/** Documentos de la solicitud de sustentación (entrega final). */
export interface SustentationRequestFiles {
  monograph: File;
  formatE: File;
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
 * Sustentación contra el backend: la solicita el director, Decanatura revisa el
 * paz y salvo, la programa el Consejo con un jurado coordinador, la califica el coordinador (con el acta)
 * o registra la inasistencia; el director radica los ajustes y el coordinador
 * los verifica y carga la versión definitiva. El otro jurado solo consulta.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkSustentationService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /** Solicitud de sustentación del director (entrega final). */
  requestSustentation(thesisWorkId: string, files: SustentationRequestFiles): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion', null, {
      monografia: files.monograph, documentoFinal: files.formatE, conceptoAsesor: files.advisorConcept,
      anexos: files.annexes
    }));
  }

  /**
   * Revisión del paz y salvo de Decanatura: lo aprueba o no, siempre con el
   * formato F; si no lo aprueba, con observaciones. Sin paz y salvo aprobado
   * el Consejo no programa la sustentación.
   */
  reviewPazYSalvo(thesisWorkId: string, approved: boolean, observations: string, formatF: File): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion/paz-y-salvo',
      { aprobado: approved, observaciones: observations.trim() || null }, { archivo: formatF }));
  }

  /**
   * Programación del Consejo (primera o segunda sesión), con el formato E. El
   * backend asigna los roles de jurado; los jurados los reciben al llegarles la notificación.
   */
  scheduleSustentation(thesisWorkId: string, schedule: SustentationSchedule): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion/programacion', {
      juradoCoordinadorId: Number(schedule.coordinatorId), juradoId: Number(schedule.jurorId),
      fechaHora: schedule.dateTime, salon: schedule.location
    }, { archivo: schedule.formatE }));
  }

  /** Calificación del jurado coordinador con el acta (formato G). */
  gradeSustentation(thesisWorkId: string, grade: CalificacionApi, observations: string,
    record: File): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion/calificaciones',
      { calificacion: grade, observaciones: observations.trim() || null }, { archivo: record }));
  }

  /** Inasistencia del estudiante, registrada por el jurado coordinador. */
  registerNonAttendance(thesisWorkId: string, observations: string): Observable<ThesisWork> {
    return this.operar(
      this.api.enviarJson(thesisWorkId, 'sustentacion/inasistencia', { observaciones: observations.trim() }));
  }

  /** Ajustes del director (aprobada con observaciones), con anexos opcionales. */
  submitAdjustments(thesisWorkId: string, adjustments: File, annexes?: File | null): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion/ajustes', null,
      { archivo: adjustments, anexos: annexes }));
  }

  /** Verificación de los ajustes por el jurado coordinador. */
  verifyAdjustments(thesisWorkId: string, fulfills: boolean, observations: string): Observable<ThesisWork> {
    return this.operar(this.api.enviarJson(thesisWorkId, 'sustentacion/ajustes/verificaciones',
      { cumple: fulfills, observaciones: observations.trim() || null }));
  }

  /** Versión definitiva (formato H) del jurado coordinador: el trabajo finaliza. */
  uploadFinalVersion(thesisWorkId: string, document: File): Observable<ThesisWork> {
    return this.operar(this.api.enviarArchivos(thesisWorkId, 'sustentacion/version-definitiva', null,
      { archivo: document }));
  }

  /** Actualiza el almacén con la respuesta (las notificaciones las genera el backend). */
  private operar(peticion: Observable<TrabajoGradoResponse>): Observable<ThesisWork> {
    return peticion.pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  private vista(trabajo: TrabajoGradoResponse): ThesisWork {
    const thesisWork = aTrabajoDeGrado(trabajo, this.vistas.contexto());
    if (!thesisWork) throw new Error('El trabajo de grado no está en curso.');
    return thesisWork;
  }
}
