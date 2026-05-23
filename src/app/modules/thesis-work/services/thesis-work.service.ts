// features/thesis-work/services/thesis-work.service.ts
import { inject, Injectable } from '@angular/core';

// --- Importación de Sub-servicios ---
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { ThesisWorkAdvanceService } from './thesis-work-advance.service';
import { ThesisWorkDeliveryService } from './thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from './thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from './thesis-work-special-request.service';
import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';

// --- Interfaces y Enums ---
import { Document } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { CreateAdvanceRequest } from '../interfaces/advance-playload.interface';
import { PazYSalvoPayload } from '../interfaces/paz-y-salvo-playload.interface';

@Injectable({
  providedIn: 'root'
})
export class ThesisWorkService {
  // ==========================================
  // INYECCIÓN DE DEPENDENCIAS (Angular >= 14)
  // ==========================================
  private readonly storage = inject(ThesisWorkStorageService);
  private readonly advanceService = inject(ThesisWorkAdvanceService);
  private readonly deliveryService = inject(ThesisWorkDeliveryService);
  private readonly evaluationService = inject(ThesisWorkEvaluationService);
  private readonly specialRequestService = inject(ThesisWorkSpecialRequestService);
  private readonly sustentationService = inject(ThesisWorkSustentationService);

  // --- Exposición del Estado Reactivo Global ---
  readonly thesisWorks = this.storage.thesisWorks;

  // ==========================================
  // DELEGACIÓN DE MÉTODOS (Patrón Fachada)
  // ==========================================

  // --- 📖 Lecturas (Storage) ---
  getThesisWorkByIdMock(id: string) {
    return this.storage.getById(id);
  }

  // --- 🚀 Avances (Advance Service) ---
  uploadDocumentMock(thesisWorkId: string, document: Document, advanceMeta?: CreateAdvanceRequest ) {
    return this.advanceService.uploadDocumentMock(thesisWorkId, document, advanceMeta);
  }

  // --- 📦 Entregas, Correcciones y Cierre (Delivery Service) ---
  uploadFinalDeliveryMock(thesisWorkId: string, monograph: File, formatE: File, annexes?: File) {
    return this.deliveryService.uploadFinalDeliveryMock(thesisWorkId, monograph, formatE, annexes);
  }

  uploadCorrectedDocumentsMock(thesisWorkId: string, monograph: File, annexes?: File) {
    return this.deliveryService.uploadCorrectedDocumentsMock(thesisWorkId, monograph, annexes);
  }

  registerCorrespondenceDocumentMock(thesisWorkId: string, document: Document) {
    return this.deliveryService.registerCorrespondenceDocumentMock(thesisWorkId, document);
  }

  registerPazYSalvoMock(thesisWorkId: string, payload: PazYSalvoPayload , file: File) {
    return this.deliveryService.registerPazYSalvoMock(thesisWorkId, payload, file);
  }

  // --- 📝 Evaluaciones (Evaluation Service) ---
  addEvaluationMock(thesisWorkId: string, evaluation: Evaluation) {
    return this.evaluationService.addEvaluationMock(thesisWorkId, evaluation);
  }

  // --- 🎓 Sustentaciones (Sustentation Service) ---
  saveSustentationRegistryMock(thesisWorkId: string, formData: any) {
    return this.sustentationService.saveSustentationRegistryMock(thesisWorkId, formData);
  }

  registerSustentationVerdictMock(thesisWorkId: string, payload: { veredict: stateList; observations: string; evaluationDate: Date }, file: File) {
    return this.sustentationService.registerSustentationVerdictMock(thesisWorkId, payload, file);
  }

  evaluateCorrectedDocumentsMock(thesisWorkId: string, evaluationData: Omit<Evaluation, 'id' | 'date'>, formatGFile: File) {
    return this.sustentationService.evaluateCorrectedDocumentsMock(thesisWorkId, evaluationData, formatGFile);
  }

  // --- ⚠️ Solicitudes Especiales (Special Request Service) ---
  createSpecialRequestMock(payload: { requestType: string; comments: string; thesisId: string }) {
    return this.specialRequestService.createSpecialRequestMock(payload);
  }

  evaluateSpecialRequestMock(thesisWorkId: string, requestId: string, payload: { status: stateList.APROBADO | stateList.NO_APROBADO; resolutionDetails: string }) {
    return this.specialRequestService.evaluateSpecialRequestMock(thesisWorkId, requestId, payload);
  }
}

