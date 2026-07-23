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
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (preliminaryDraft) => {
          const proposal = preliminaryDraft.proposalData;
          if (proposal) {
            currentDraftTitle = proposal.title || '';
            proposal.authors?.forEach(author => {
              const id = typeof author === 'string' ? author : author?.id;
              if (id) notifyUserIds.push(id);
            });
            if (proposal.director?.id)   notifyUserIds.push(proposal.director.id);
            if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
            if (proposal.advisor?.id)    notifyUserIds.push(proposal.advisor.id);
          }

          const remainingDays = preliminaryDraft.evaluationDeadline
            ? getRemainingBusinessDays(new Date(preliminaryDraft.evaluationDeadline))
            : 0;

          const evaluationWithStatus = {
            ...evaluation,
            deadlineStatus: remainingDays < 0
              ? EvaluationDeadlineStatus.DELAYED
              : EvaluationDeadlineStatus.ON_TIME
          };

          return {
            ...preliminaryDraft,
            evaluations: [evaluationWithStatus, ...(preliminaryDraft.evaluations || [])],
            state: preliminaryDraft.state
          };
        });

        const jefesDepto = this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.JEFE_DEP))
          .map(user => user.id);
        notifyUserIds.push(...jefesDepto);

        this.eventBus.emit({
          type: AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED,
          targetUserIds: [...new Set(notifyUserIds)],
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
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(preliminaryDraftId, (preliminaryDraft) => {
          const proposal = preliminaryDraft.proposalData;
          if (proposal) currentTitle = proposal.title || '';

          let newDeadline = preliminaryDraft.evaluationDeadline;

          // String literal 'Correccion' → DocumentType.CORRECCION (S1481 / type-safety)
          if (document.type === DocumentType.CORRECCION) {
            newDeadline = addBusinessDays(new Date(), 10);
            if (preliminaryDraft.evaluators) {
              notifyUserIds.push(...preliminaryDraft.evaluators.map(evaluator => evaluator.id));
            }
            if (proposal?.director?.id) notifyUserIds.push(proposal.director.id);
          } else if (document.type === DocumentType.FORMATO_C) {
            newDeadline = undefined;
            if (proposal) {
              proposal.authors?.forEach(author => {
                const id = typeof author === 'string' ? author : author?.id;
                if (id) notifyUserIds.push(id);
              });
              if (proposal.director?.id)   notifyUserIds.push(proposal.director.id);
              if (proposal.codirector?.id) notifyUserIds.push(proposal.codirector.id);
              if (proposal.advisor?.id)    notifyUserIds.push(proposal.advisor.id);
            }
          } else {
            newDeadline = undefined;
            proposal?.authors?.forEach(author => {
              const id = typeof author === 'string' ? author : author?.id;
              if (id) notifyUserIds.push(id);
            });
          }

          return {
            ...preliminaryDraft,
            documents: [document, ...(preliminaryDraft.documents || [])],
            state: stateList.EN_REVISION,
            evaluationDeadline: newDeadline
          };
        });

        if (document.type === DocumentType.FORMATO_C) {
          const jefesYConsejo = this.userService.users()
            .filter(user => user.roles.includes(UserRoleType.JEFE_DEP) || user.roles.includes(UserRoleType.CONSEJO))
            .map(user => user.id);
          notifyUserIds.push(...jefesYConsejo);
        }

        const eventType = document.type === DocumentType.FORMATO_C
          ? AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED
          : AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED;

        this.eventBus.emit({
          type: eventType,
          targetUserIds: [...new Set(notifyUserIds)],
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
        let currentTitle = '';
        const notifyUserIds: string[] = [];

        this.storage.updateDraft(id, (preliminaryDraft) => {
          currentTitle = preliminaryDraft.proposalData?.title || '';

          const updated: PreliminaryDraft = {
            ...preliminaryDraft,
            documents: [...(preliminaryDraft.documents || []), document],
            state,
            evaluations: [...(preliminaryDraft.evaluations || []), evaluation],
            maximumDeliveryDate: state === stateList.APROBADO
              ? maximumDeliveryDate
              : preliminaryDraft.maximumDeliveryDate
          };

          updatedDraftRef = updated;

          updated.proposalData?.authors?.forEach(author => {
            const authorId = typeof author === 'string' ? author : author?.id;
            if (authorId) notifyUserIds.push(authorId);
          });
          if (updated.proposalData?.director?.id)   notifyUserIds.push(updated.proposalData.director.id);
          if (updated.proposalData?.codirector?.id) notifyUserIds.push(updated.proposalData.codirector.id);
          if (updated.proposalData?.advisor?.id)    notifyUserIds.push(updated.proposalData.advisor.id);
          if (updated.evaluators) notifyUserIds.push(...updated.evaluators.map(e => e.id));

          const jefesYConsejo = this.userService.users()
            .filter(user => user.roles.includes(UserRoleType.JEFE_DEP) || user.roles.includes(UserRoleType.CONSEJO))
            .map(user => user.id);
          notifyUserIds.push(...jefesYConsejo);

          return updated;
        });

        if (updatedDraftRef) {
          this.eventBus.emit({
            type: AppEventType.COUNCIL_RESOLUTION_UPLOADED,
            targetUserIds: [...new Set(notifyUserIds)],
            payload: { preliminaryDraftId: id, finalState: state, preliminaryDraftTitle: currentTitle }
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
}
