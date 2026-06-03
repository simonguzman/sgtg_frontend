import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

// --- Sub-servicios Inyectados ---
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';

// --- Interfaces y Modelos ---
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly assignmentService = inject(PreliminaryDraftAssignmentService);
  private readonly documentService = inject(PreliminaryDraftDocumentService);

  readonly preliminaryDrafts = this.storage.preliminaryDrafts;

  getPreliminaryDraftByIdMock(id: string): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id);
  }

  createPreliminaryDraftMock(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return of(preliminaryDraft).pipe(
      delay(1000),
      tap(newDraft => {
        const draftToSave: PreliminaryDraft = {
          ...newDraft,
          preliminaryDraftId: crypto.randomUUID(),
          evaluations: newDraft.evaluations || [],
          documents: newDraft.documents || [],
          createdData: new Date(),
          state: newDraft.state || stateList.EN_REVISION
        };
        this.storage.addDraft(draftToSave);
      })
    );
  }

  updatePreliminaryDraftMock(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return of(updatedData).pipe(
      delay(800),
      tap(() => {
        this.storage.updateDraft(id, (draft) => ({
          ...draft,
          ...updatedData
        }));
      })
    );
  }

  deleteDraftMock(id: string): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => this.storage.removeDraft(id))
    );
  }

  validateReviewersRules(originalProposal: Proposal, evaluator1Id: string, evaluator2Id: string): string | null {
    return this.assignmentService.validateReviewersRules(originalProposal, evaluator1Id, evaluator2Id);
  }

  assignReviewersMock(preliminaryDraftId: string, evaluatorsIds: string[]): Observable<void> {
    return this.assignmentService.assignReviewersMock(preliminaryDraftId, evaluatorsIds);
  }

  addEvaluationMock(preliminaryDraftId: string, evaluation: Evaluation): Observable<void> {
    return this.documentService.addEvaluationMock(preliminaryDraftId, evaluation);
  }

  uploadDocumentMock(preliminaryDraftId: string, document: Document): Observable<void> {
    return this.documentService.uploadDocumentMock(preliminaryDraftId, document);
  }

  uploadCouncilResolutionMock(
    id: string,
    document: Document,
    state: stateList,
    evaluation: Evaluation,
    maximumDeliveryDate?: Date | string // 👈 Mapeamos el nuevo parámetro aquí
  ): Observable<PreliminaryDraft | undefined> {
    // 👈 Lo pasamos de manera transparente al sub-servicio documental
    return this.documentService.uploadCouncilResolutionMock(id, document, state, evaluation, maximumDeliveryDate);
  }

  calculateDocumentStatus(documentId: string, evaluations: Evaluation[], totalEvaluators: number): stateList {
    return this.documentService.calculateDocumentStatus(documentId, evaluations, totalEvaluators);
  }
}
