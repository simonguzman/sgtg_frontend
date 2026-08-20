import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { addBusinessDays, getRemainingBusinessDays } from '../../../core/utils/date-utils';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftDocumentService {
  private readonly storage = inject(PreliminaryDraftStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  public addEvaluationMock(
    preliminaryDraftId: string,
    evaluation: Evaluation
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let currentDraftTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (draft) => {
          currentDraftTitle = draft.proposalData?.title || '';

          // 🔹 REFACTOR: Uso del helper para limpiar el código
          notifyUserIds = this.extractUserIdsToNotify(draft, { includeJefes: true });

          const remainingDays = draft.evaluationDeadline
            ? getRemainingBusinessDays(new Date(draft.evaluationDeadline))
            : 0;

          const evaluationWithStatus = {
            ...evaluation,
            deadlineStatus: remainingDays < 0
              ? EvaluationDeadlineStatus.DELAYED
              : EvaluationDeadlineStatus.ON_TIME
          };

          return {
            ...draft,
            evaluations: [evaluationWithStatus, ...(draft.evaluations || [])]
          };
        });

        this.eventBus.emit({
          type: AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED,
          targetUserIds: notifyUserIds,
          payload: { preliminaryDraftId, veredict: evaluation.veredict, preliminaryDraftTitle: currentDraftTitle }
        });
      })
    );
  }

  public uploadDocumentMock(
    preliminaryDraftId: string,
    document: FileDocument
  ): Observable<void> {
    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        let currentTitle = '';
        let notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (draft) => {
          currentTitle = draft.proposalData?.title || '';
          let newDeadline = draft.evaluationDeadline;

          if (document.type === DocumentType.CORRECCION) {
            newDeadline = addBusinessDays(new Date(), 10);
            notifyUserIds = this.extractUserIdsToNotify(draft, { includeEvaluators: true });
          } else if (document.type === DocumentType.FORMATO_C) {
            newDeadline = undefined;
            notifyUserIds = this.extractUserIdsToNotify(draft, { includeJefes: true, includeConsejo: true });
          } else {
            newDeadline = undefined;
            notifyUserIds = this.extractUserIdsToNotify(draft);
          }

          return {
            ...draft,
            documents: [document, ...(draft.documents || [])],
            state: stateList.EN_REVISION,
            evaluationDeadline: newDeadline
          };
        });

        const eventType = document.type === DocumentType.FORMATO_C
          ? AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED
          : AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED;

        this.eventBus.emit({
          type: eventType,
          targetUserIds: notifyUserIds,
          payload: { preliminaryDraftId, documentType: document.type, preliminaryDraftTitle: currentTitle }
        });
      })
    );
  }

  public uploadCouncilResolutionMock(
    id: string,
    document: FileDocument,
    state: stateList,
    evaluation: Evaluation,
    maximumDeliveryDate?: Date | string
  ): Observable<PreliminaryDraft | undefined> {
    return of(undefined).pipe(
      delay(1000),
      map(() => {
        let updatedDraftRef: PreliminaryDraft | undefined;
        let notifyUserIds: string[] = [];

        this.storage.updateDraft(id, (draft) => {
          const updated: PreliminaryDraft = {
            ...draft,
            documents: [...(draft.documents || []), document],
            state,
            evaluations: [...(draft.evaluations || []), evaluation],
            maximumDeliveryDate: state === stateList.APROBADO
              ? maximumDeliveryDate
              : draft.maximumDeliveryDate
          };

          notifyUserIds = this.extractUserIdsToNotify(updated, {
            includeEvaluators: true,
            includeJefes: true,
            includeConsejo: true
          });

          updatedDraftRef = updated;
          return updated;
        });

        if (updatedDraftRef) {
          this.eventBus.emit({
            type: AppEventType.COUNCIL_RESOLUTION_UPLOADED,
            targetUserIds: notifyUserIds,
            payload: { preliminaryDraftId: id, finalState: state, preliminaryDraftTitle: updatedDraftRef.proposalData?.title || '' }
          });
        }

        return updatedDraftRef;
      })
    );
  }

  public calculateDocumentStatus(
    documentId: string,
    evaluations: Evaluation[],
    totalEvaluators: number
  ): stateList {
    if (totalEvaluators === 0) return stateList.EN_REVISION;

    const documentEvaluations = evaluations?.filter(e => e.documentId === documentId) ?? [];
    if (documentEvaluations.length < totalEvaluators) return stateList.EN_REVISION;
    if (documentEvaluations.some(evaluation => evaluation.veredict === stateList.NO_APROBADO)) return stateList.NO_APROBADO;
    return stateList.APROBADO;
  }

  // 🔹 REFACTOR: Helper centralizado para no repetir lógica
  private extractUserIdsToNotify(
    draft: PreliminaryDraft,
    options: { includeEvaluators?: boolean; includeJefes?: boolean; includeConsejo?: boolean } = {}
  ): string[] {
    const ids = new Set<string>();
    const proposal = draft.proposalData;

    if (proposal) {
      proposal.authors?.forEach(author => {
        const id = typeof author === 'string' ? author : author?.id;
        if (id) ids.add(id);
      });
      if (proposal.director?.id) ids.add(proposal.director.id);
      if (proposal.codirector?.id) ids.add(proposal.codirector.id);
      if (proposal.advisor?.id) ids.add(proposal.advisor.id);
    }

    if (options.includeEvaluators && draft.evaluators) {
      draft.evaluators.forEach(e => ids.add(e.id));
    }

    if (options.includeJefes || options.includeConsejo) {
      this.userService.users().forEach(user => {
        if (options.includeJefes && user.roles.includes(UserRoleType.JEFE_DEP)) ids.add(user.id);
        if (options.includeConsejo && user.roles.includes(UserRoleType.CONSEJO)) ids.add(user.id);
      });
    }

    return Array.from(ids); // Set garantiza que no haya IDs duplicados
  }
}
