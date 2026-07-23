import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

@Injectable({ providedIn: 'root' })
export class PreliminaryDraftAssignmentService {
  private readonly storage     = inject(PreliminaryDraftStorageService);
  private readonly userService = inject(UserService);
  private readonly eventBus    = inject(EventBusService);

  public validateReviewersRules(
    originalProposal: Proposal,
    evaluator1Id: string,
    evaluator2Id: string
  ): string | null {
    if (evaluator1Id === evaluator2Id) {
      return 'Debe seleccionar dos evaluadores diferentes.';
    }
    if (!originalProposal) {
      return 'No se proporcionaron los datos de la propuesta.';
    }

    const forbiddenIds = new Set<string>();
    if (originalProposal.director?.id)   forbiddenIds.add(originalProposal.director.id);
    if (originalProposal.codirector?.id) forbiddenIds.add(originalProposal.codirector.id);
    if (originalProposal.advisor?.id)    forbiddenIds.add(originalProposal.advisor.id);

    originalProposal.authors?.forEach(author => {
      const id = typeof author === 'string' ? author : author?.id;
      if (id) forbiddenIds.add(id);
    });

    if (forbiddenIds.has(evaluator1Id)) return 'El primer docente tiene vínculos con la propuesta.';
    if (forbiddenIds.has(evaluator2Id)) return 'El segundo docente tiene vínculos con la propuesta.';
    return null;
  }

  public assignReviewersMock(
    preliminaryDraftId: string,
    evaluatorsIds: string[]
  ): Observable<void> {
    return of(undefined).pipe(
      delay(800),
      tap(() => {
        evaluatorsIds.forEach(id => this.userService.addRoleToUser(id, UserRoleType.EVALUADOR));

        const evaluatorUsers = evaluatorsIds
          .map(id => this.userService.users().find(user => user.id === id))
          .filter((user): user is User => !!user);

        const deadline = addBusinessDays(new Date(), 10);
        let currentDraftTitle = '';
        const notifyUserIds: string[] = [...evaluatorsIds];

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
          return {
            ...preliminaryDraft,
            evaluators: evaluatorUsers,
            state: stateList.EN_REVISION,
            evaluationDeadline: deadline
          };
        });

        this.eventBus.emit({
          type: AppEventType.REVIEWERS_ASSIGNED,
          targetUserIds: [...new Set(notifyUserIds)],
          payload: {
            preliminaryDraftId,
            evaluators: evaluatorsIds,
            preliminaryDraftTitle: currentDraftTitle
          }
        });
      })
    );
  }
}
