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
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/models/user-role';

@Injectable({
  providedIn: 'root'
})
export class PreliminaryDraftService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly assignmentService = inject(PreliminaryDraftAssignmentService);
  private readonly documentService = inject(PreliminaryDraftDocumentService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  // Exposición limpia de la señal computada del almacenamiento
  readonly preliminaryDrafts = this.storage.preliminaryDrafts;

  readonly allPreliminaryDrafts = this.storage.allPreliminaryDrafts;

  getPreliminaryDraftByIdMock(id: string): Observable<PreliminaryDraft | undefined> {
    return this.storage.getById(id);
  }

  /**
   * Crea un nuevo registro de anteproyecto, asigna identificadores y notifica a todos los involucrados.
   */
  createPreliminaryDraftMock(preliminaryDraft: PreliminaryDraft): Observable<PreliminaryDraft> {
    return of(preliminaryDraft).pipe(
      delay(1000),
      tap(newPreliminaryDraft => {
        const preliminaryDraftToSave: PreliminaryDraft = {
          ...newPreliminaryDraft,
          preliminaryDraftId: crypto.randomUUID(),
          evaluations: newPreliminaryDraft.evaluations || [],
          documents: newPreliminaryDraft.documents || [],
          createdData: new Date(),
          state: newPreliminaryDraft.state || stateList.EN_REVISION
        };

        this.storage.addDraft(preliminaryDraftToSave);

        const notifyUserIds: string[] = [];
        const proposal = preliminaryDraftToSave.proposalData;

        if (proposal) {
          // 💡 Ajuste: Inclusión obligatoria de autores (estudiantes) en la notificación de radicación
          proposal.authors?.forEach(author => {
            if (typeof author === 'string') notifyUserIds.push(author);
            else if (author?.id) notifyUserIds.push(author.id);
          });

          // Inclusión del equipo directivo y asesores
          if (proposal.director?.id) notifyUserIds.push(proposal.director.id);
          if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
          if (proposal.advisor?.id) notifyUserIds.push(proposal.advisor.id);
        }

        // Obtener miembros del Comité de Programa
        const committeeIds = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .map(user => user.id);
        notifyUserIds.push(...committeeIds);

        // 💡 Ajuste: Estandarización de claves en payload para soporte completo del procesador de notificaciones
        this.eventBus.emit({
          type: AppEventType.PRELIMINARY_DRAFT_CREATED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            preliminaryDraftId: preliminaryDraftToSave.preliminaryDraftId,
            preliminaryDraftTitle: proposal?.title || '' // Título inyectado directamente
          }
        });
      })
    );
  }

  updatePreliminaryDraftMock(id: string, updatedData: PreliminaryDraft): Observable<PreliminaryDraft> {
    return of(updatedData).pipe(
      delay(800),
      tap(() => {
        this.storage.updateDraft(id, (preliminaryDraft) => ({
          ...preliminaryDraft,
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

  // --- Delegación de Responsabilidades a Sub-servicios Especializados ---

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
    maximumDeliveryDate?: Date | string
  ): Observable<PreliminaryDraft | undefined> {
    return this.documentService.uploadCouncilResolutionMock(id, document, state, evaluation, maximumDeliveryDate);
  }

  calculateDocumentStatus(documentId: string, evaluations: Evaluation[], totalEvaluators: number): stateList {
    return this.documentService.calculateDocumentStatus(documentId, evaluations, totalEvaluators);
  }
}
