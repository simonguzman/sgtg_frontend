import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkApiService } from './thesis-work-api.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { SustentationVeredict, ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { SustentationFormData } from '../interfaces/sustentation-form-data.interface';

@Injectable({ providedIn: 'root' })
export class ThesisWorkService {
  private readonly storage             = inject(ThesisWorkStorageService);
  private readonly api                 = inject(ThesisWorkApiService);
  private readonly advanceService      = inject(ThesisWorkAdvanceService);
  private readonly deliveryService     = inject(ThesisWorkDeliveryService);
  private readonly evaluationService   = inject(ThesisWorkEvaluationService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);
  // ← EventBusService y UserApiService eliminados: sus responsabilidades
  //   están en ThesisWorkApiService y los sub-servicios especializados.

  readonly thesisWorks    = this.storage.thesisWorks;
  readonly allThesisWorks = this.storage.allThesisWorks;

  constructor() {
    // verifyDeliveryDeadlinesMock se ejecuta una vez al iniciar la app.
    // of() completa automáticamente tras emitir, no hay memory leak.
    this.api.verifyDeliveryDeadlinesMock().subscribe();
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  getThesisWorkByIdMock(id: string) {
    return this.api.getThesisWorkByIdMock(id);
  }

  reactivateThesisWorkMock(thesisWorkId: string): Observable<void> {
    return this.api.reactivateThesisWorkMock(thesisWorkId);
  }

  // ── Avances ───────────────────────────────────────────────────────────────
  uploadDocumentMock(
    thesisWorkId: string,
    document: FileDocument,
    advanceMeta?: CreateAdvanceRequest
  ): Observable<void> {
    return this.advanceService.uploadDocumentMock(thesisWorkId, document, advanceMeta);
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

  // ── Evaluación de avances ─────────────────────────────────────────────────
  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation): Observable<void> {
    return this.evaluationService.addEvaluationMock(thesisWorkId, evaluation);
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
  createSpecialRequestMock(
    payload: { requestType: SpecialRequestType; comments: string; thesisId: string }
  ): Observable<void> {
    return this.specialRequestService.createSpecialRequestMock(payload);
  }

  evaluateSpecialRequestMock(
    thesisWorkId: string,
    requestId: string,
    payload: {
      status: stateList.APROBADO | stateList.NO_APROBADO;
      resolutionDetails: string;
      grantedDeadline?: Date;
    }
  ): Observable<void> {
    return this.specialRequestService.evaluateSpecialRequestMock(thesisWorkId, requestId, payload);
  }
}
