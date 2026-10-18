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

@Injectable({ providedIn: 'root' })
export class ThesisWorkService {
  private readonly storage             = inject(ThesisWorkStorageService);
  private readonly advanceService      = inject(ThesisWorkAdvanceService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);

  readonly thesisWorks    = this.storage.thesisWorks;
  readonly allThesisWorks = this.storage.allThesisWorks;
  readonly isHydrated     = this.storage.isHydrated;

  // ── Consulta ──────────────────────────────────────────────────────────────
  /** Trabajo de grado por id (vista del backend). */
  getThesisWorkById(id: string): Observable<ThesisWork | undefined> {
    return this.storage.getById(id);
  }

  // ── Informes mensuales ────────────────────────────────────────────────────
  radicarInforme(thesisWorkId: string, informe: File, observaciones: string): Observable<ThesisWork> {
    return this.advanceService.radicarInforme(thesisWorkId, informe, observaciones);
  }

  revisarInforme(thesisWorkId: string, numero: string, observaciones: string, notas: File | null): Observable<ThesisWork> {
    return this.advanceService.revisarInforme(thesisWorkId, numero, observaciones, notas);
  }

  // ── Sustentación ──────────────────────────────────────────────────────────
  requestSustentation(thesisWorkId: string, files: SustentationRequestFiles): Observable<ThesisWork> {
    return this.sustentationService.requestSustentation(thesisWorkId, files);
  }

  scheduleSustentation(thesisWorkId: string, schedule: SustentationSchedule): Observable<ThesisWork> {
    return this.sustentationService.scheduleSustentation(thesisWorkId, schedule);
  }

  gradeSustentation(thesisWorkId: string, grade: CalificacionApi, observations: string,
    record: File): Observable<ThesisWork> {
    return this.sustentationService.gradeSustentation(thesisWorkId, grade, observations, record);
  }

  registerNonAttendance(thesisWorkId: string, observations: string): Observable<ThesisWork> {
    return this.sustentationService.registerNonAttendance(thesisWorkId, observations);
  }

  submitAdjustments(thesisWorkId: string, adjustments: File, annexes?: File | null): Observable<ThesisWork> {
    return this.sustentationService.submitAdjustments(thesisWorkId, adjustments, annexes);
  }

  reviewPazYSalvo(thesisWorkId: string, approved: boolean, observations: string, formatF: File): Observable<ThesisWork> {
    return this.sustentationService.reviewPazYSalvo(thesisWorkId, approved, observations, formatF);
  }

  verifyAdjustments(thesisWorkId: string, fulfills: boolean, observations: string): Observable<ThesisWork> {
    return this.sustentationService.verifyAdjustments(thesisWorkId, fulfills, observations);
  }

  uploadFinalVersion(thesisWorkId: string, document: File): Observable<ThesisWork> {
    return this.sustentationService.uploadFinalVersion(thesisWorkId, document);
  }

  // ── Solicitudes especiales ────────────────────────────────────────────────
  createSpecialRequest(thesisWorkId: string, solicitud: SpecialRequestSubmission): Observable<ThesisWork> {
    return this.specialRequestService.createSpecialRequest(thesisWorkId, solicitud);
  }

  evaluateSpecialRequest(thesisWorkId: string, request: SpecialRequest,
    decision: SpecialRequestDecision): Observable<ThesisWork> {
    return this.specialRequestService.evaluateSpecialRequest(thesisWorkId, request, decision);
  }
}
