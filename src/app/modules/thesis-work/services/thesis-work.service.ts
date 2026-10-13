import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import {
  SpecialRequestDecision, SpecialRequestSubmission, ThesisWorkSpecialRequestService
} from './thesis-work-special-request.service';
import { SustentationVeredict, ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { SustentationFormData } from '../interfaces/sustentation-form-data.interface';

@Injectable({ providedIn: 'root' })
export class ThesisWorkService {
  private readonly storage             = inject(ThesisWorkStorageService);
  private readonly advanceService      = inject(ThesisWorkAdvanceService);
  private readonly deliveryService     = inject(ThesisWorkDeliveryService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);

  readonly thesisWorks    = this.storage.thesisWorks;
  readonly allThesisWorks = this.storage.allThesisWorks;
  readonly isHydrated     = this.storage.isHydrated;

  // ── Consulta ──────────────────────────────────────────────────────────────
  /** Trabajo de grado por id (vista del backend). */
  getThesisWorkByIdMock(id: string): Observable<ThesisWork | undefined> {
    return this.storage.getById(id);
  }

  // ── Informes mensuales ────────────────────────────────────────────────────
  radicarInforme(thesisWorkId: string, informe: File, observaciones: string): Observable<ThesisWork> {
    return this.advanceService.radicarInforme(thesisWorkId, informe, observaciones);
  }

  revisarInforme(thesisWorkId: string, numero: string, observaciones: string, notas: File | null): Observable<ThesisWork> {
    return this.advanceService.revisarInforme(thesisWorkId, numero, observaciones, notas);
  }

  // ── Entregas ──────────────────────────────────────────────────────────────
  uploadFinalDeliveryMock(
    thesisWorkId: string,
    monograph: File,
    formatE: File,
    annexes?: File
  ): Observable<void> {
    return this.deliveryService.uploadFinalDeliveryMock(thesisWorkId, monograph, formatE, annexes);
  }

  uploadCorrectedDocumentsMock(thesisWorkId: string, monograph: File, annexes?: File): Observable<void> {
    return this.deliveryService.uploadCorrectedDocumentsMock(thesisWorkId, monograph, annexes);
  }

  registerCorrespondenceDocumentMock(thesisWorkId: string, document: FileDocument): Observable<void> {
    return this.deliveryService.registerCorrespondenceDocumentMock(thesisWorkId, document);
  }

  registerPazYSalvoMock(thesisWorkId: string, payload: PazYSalvoPayload, file: File): Observable<void> {
    return this.deliveryService.registerPazYSalvoMock(thesisWorkId, payload, file);
  }

  // ── Sustentación ──────────────────────────────────────────────────────────
  saveSustentationRegistryMock(
    thesisWorkId: string,
    formData: SustentationFormData
  ): Observable<void> {
    return this.sustentationService.saveSustentationRegistryMock(thesisWorkId, formData);
  }

  registerSustentationVerdictMock(
    thesisWorkId: string,
    payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date },
    file: File
  ): Observable<void> {
    return this.sustentationService.registerSustentationVerdictMock(thesisWorkId, payload, file);
  }

  evaluateCorrectedDocumentsMock(
    thesisWorkId: string,
    evaluationData: Omit<Evaluation, 'id' | 'date'>,
    formatGFile: File
  ): Observable<void> {
    return this.sustentationService.evaluateCorrectedDocumentsMock(thesisWorkId, evaluationData, formatGFile);
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
