import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import {
  SpecialRequestDecision, SpecialRequestSubmission, ThesisWorkSpecialRequestService
} from './thesis-work-special-request.service';
import {
  SustentationRequestFiles, SustentationSchedule, ThesisWorkSustentationService
} from './thesis-work-sustentation.service';
import { CalificacionApi } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';

/**
 * Fachada del módulo de trabajos de grado: reúne el almacén y las operaciones de los informes mensuales, la
 * sustentación y las solicitudes especiales.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkService {
  private readonly storage             = inject(ThesisWorkStorageService);
  private readonly advanceService      = inject(ThesisWorkAdvanceService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);

  /** Trabajos activos visibles para el usuario. */
  readonly thesisWorks    = this.storage.thesisWorks;
  /** Todos los trabajos del almacén, también los archivados. */
  readonly allThesisWorks = this.storage.allThesisWorks;

  /** Trabajo de grado por id (vista del backend). */
  getThesisWorkById(id: string): Observable<ThesisWork | undefined> {
    return this.storage.getById(id);
  }

  /** Radica el informe mensual de la reunión de seguimiento agendada. */
  radicarInforme(thesisWorkId: string, informe: File, observaciones: string): Observable<ThesisWork> {
    return this.advanceService.radicarInforme(thesisWorkId, informe, observaciones);
  }

  /** Registra la revisión de un informe mensual, con notas opcionales. */
  revisarInforme(thesisWorkId: string, numero: string, observaciones: string, notas: File | null): Observable<ThesisWork> {
    return this.advanceService.revisarInforme(thesisWorkId, numero, observaciones, notas);
  }

  /** Solicita la sustentación con los documentos de la entrega final. */
  requestSustentation(thesisWorkId: string, files: SustentationRequestFiles): Observable<ThesisWork> {
    return this.sustentationService.requestSustentation(thesisWorkId, files);
  }

  /** Programa la sesión de sustentación. */
  scheduleSustentation(thesisWorkId: string, schedule: SustentationSchedule): Observable<ThesisWork> {
    return this.sustentationService.scheduleSustentation(thesisWorkId, schedule);
  }

  /** Califica la sesión de sustentación con el acta firmada. */
  gradeSustentation(thesisWorkId: string, grade: CalificacionApi, observations: string,
    record: File): Observable<ThesisWork> {
    return this.sustentationService.gradeSustentation(thesisWorkId, grade, observations, record);
  }

  /** Registra la inasistencia a la sesión de sustentación. */
  registerNonAttendance(thesisWorkId: string, observations: string): Observable<ThesisWork> {
    return this.sustentationService.registerNonAttendance(thesisWorkId, observations);
  }

  /** Radica los ajustes pedidos en la sustentación. */
  submitAdjustments(thesisWorkId: string, adjustments: File, annexes?: File | null): Observable<ThesisWork> {
    return this.sustentationService.submitAdjustments(thesisWorkId, adjustments, annexes);
  }

  /** Registra la revisión del paz y salvo de Decanatura con el formato F. */
  reviewPazYSalvo(thesisWorkId: string, approved: boolean, observations: string, formatF: File): Observable<ThesisWork> {
    return this.sustentationService.reviewPazYSalvo(thesisWorkId, approved, observations, formatF);
  }

  /** Registra la verificación de los ajustes por el jurado. */
  verifyAdjustments(thesisWorkId: string, fulfills: boolean, observations: string): Observable<ThesisWork> {
    return this.sustentationService.verifyAdjustments(thesisWorkId, fulfills, observations);
  }

  /** Carga la versión definitiva del trabajo. */
  uploadFinalVersion(thesisWorkId: string, document: File): Observable<ThesisWork> {
    return this.sustentationService.uploadFinalVersion(thesisWorkId, document);
  }

  /** Registra una solicitud especial del director. */
  createSpecialRequest(thesisWorkId: string, solicitud: SpecialRequestSubmission): Observable<ThesisWork> {
    return this.specialRequestService.createSpecialRequest(thesisWorkId, solicitud);
  }

  /** Registra la decisión del Consejo, o el concepto del Comité, sobre una solicitud especial. */
  evaluateSpecialRequest(thesisWorkId: string, request: SpecialRequest,
    decision: SpecialRequestDecision): Observable<ThesisWork> {
    return this.specialRequestService.evaluateSpecialRequest(thesisWorkId, request, decision);
  }
}
