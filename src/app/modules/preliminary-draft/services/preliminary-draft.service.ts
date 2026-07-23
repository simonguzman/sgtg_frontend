import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraftApiService } from './preliminary-draft-api.service';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly api = inject(PreliminaryDraftApiService);
  private readonly assignment = inject(PreliminaryDraftAssignmentService);
  private readonly document = inject(PreliminaryDraftDocumentService);

  // ── Estado reactivo ────────────────────────────────────────────────────────
  readonly preliminaryDrafts = this.storage.preliminaryDrafts;
  readonly allPreliminaryDrafts = this.storage.allPreliminaryDrafts;

  // ── CRUD ───────────────────────────────────────────────────────────────────
  getPreliminaryDraftById(id: string): Observable<PreliminaryDraft | undefined> {
    return this.api.getPreliminaryDraftById(id);
  }

  createPreliminaryDraft(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.createPreliminaryDraft(preliminaryDraft);
  }

  updatePreliminaryDraft(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return this.api.updatePreliminaryDraft(id, updatedData);
  }

  // Corregido: Coincide exactamente con lo que el Facade intenta llamar
  deleteDraft(id: string): Observable<void> {
    return this.api.deleteDraft(id);
  }

  // ── Asignación ─────────────────────────────────────────────────────────────
  validateReviewersRules(
    originalProposal: Proposal,
    evaluator1Id: string,
    evaluator2Id: string
  ): string | null {
    return this.assignment.validateReviewersRules(originalProposal, evaluator1Id, evaluator2Id);
  }

  assignReviewers(
    preliminaryDraftId: string,
    evaluatorsIds: string[]
  ): Observable<void> {
    // Asegúrate de cambiar el nombre del método en PreliminaryDraftAssignmentService también si quitaste el "Mock" allí
    return this.assignment.assignReviewersMock(preliminaryDraftId, evaluatorsIds);
  }

  // ── Documentos y evaluaciones ──────────────────────────────────────────────
  addEvaluation(
    preliminaryDraftId: string,
    evaluation: Evaluation
  ): Observable<void> {
    return this.document.addEvaluationMock(preliminaryDraftId, evaluation);
  }

  uploadDocument(
    preliminaryDraftId: string,
    document: FileDocument
  ): Observable<void> {
    return this.document.uploadDocumentMock(preliminaryDraftId, document);
  }

  uploadCouncilResolution(
    id: string,
    document: FileDocument,
    state: stateList,
    evaluation: Evaluation,
    maximumDeliveryDate?: Date | string
  ): Observable<PreliminaryDraft | undefined> {
    return this.document.uploadCouncilResolutionMock(id, document, state, evaluation, maximumDeliveryDate);
  }

  calculateDocumentStatus(
    documentId: string,
    evaluations: Evaluation[],
    totalEvaluators: number
  ): stateList {
    return this.document.calculateDocumentStatus(documentId, evaluations, totalEvaluators);
  }
}
