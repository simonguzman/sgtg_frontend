import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';

import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

@Injectable({
  providedIn: 'root'
})
export class ProposalApiService {
  private readonly storage = inject(ProposalStorageService);
  private readonly rulesService = inject(ProposalRulesService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  getProposalByIdMock(id: string): Observable<Proposal | undefined> {
    return this.storage.getById(id);
  }

  createProposalMock(proposal: Proposal): Observable<Proposal> {
    const newProposal: Proposal = {
      ...proposal,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      evaluationDeadline: addBusinessDays(new Date(), 10),
      state: stateList.EN_REVISION,
      documents: proposal.documents ? proposal.documents.map(document => ({
        ...document,
        id: document.id || crypto.randomUUID()
      })) : [],
      evaluations: []
    };

    return of(newProposal).pipe(
      delay(1000),
      tap(onSaved => {
        this.storage.updateProposals(currentProposal => [onSaved, ...currentProposal]);

        if (onSaved.director) this.userService.addRoleToUser(onSaved.director.id, UserRoleType.DIRECTOR);
        if (onSaved.codirector) this.userService.addRoleToUser(onSaved.codirector.id, UserRoleType.CODIRECTOR);
        if (onSaved.advisor) this.userService.addRoleToUser(onSaved.advisor.id, UserRoleType.ASESOR);

        const notifyUserIds = new Set<string>();
        onSaved.authors?.forEach(author => { if (author?.id) notifyUserIds.add(author.id); });
        if (onSaved.director?.id) notifyUserIds.add(onSaved.director.id);
        if (onSaved.codirector?.id) notifyUserIds.add(onSaved.codirector.id);
        if (onSaved.advisor?.id) notifyUserIds.add(onSaved.advisor.id);

        this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .forEach(user => notifyUserIds.add(user.id));

        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CREATED,
          targetUserIds: Array.from(notifyUserIds),
          payload: {
            proposalId: onSaved.id,
            proposalTitle: onSaved.title || ''
          }
        });
      })
    );
  }

  updateProposalMock(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    const oldProposal = this.storage.getProposalsListSnapshot().find(p => p.id === id);
    if (!oldProposal) throw new Error(`Propuesta con ID ${id} no encontrada.`);

    const updatedProposal: Proposal = { ...oldProposal, ...changes };

    return of(updatedProposal).pipe(
      delay(1000),
      tap((savedProposal) => {
        this.rulesService.handleRoleExchange(oldProposal.codirector?.id, changes.codirector?.id, UserRoleType.CODIRECTOR, id);
        this.rulesService.handleRoleExchange(oldProposal.advisor?.id, changes.advisor?.id, UserRoleType.ASESOR, id);

        this.storage.updateProposals(list => list.map(proposal => (proposal.id === id ? savedProposal : proposal)));
      })
    );
  }

  deleteProposalMock(id: string): Observable<boolean> {
    const proposalToRemove = this.storage.getProposalsListSnapshot().find(p => p.id === id);
    if (!proposalToRemove) return of(false);

    return of(true).pipe(
      delay(1000),
      tap(() => {
        this.storage.updateProposals(list => list.filter(proposal => proposal.id !== id));

        const rolesToCheck = [
          { id: proposalToRemove.codirector?.id, role: UserRoleType.CODIRECTOR },
          { id: proposalToRemove.advisor?.id, role: UserRoleType.ASESOR }
        ];

        rolesToCheck.forEach(({ id: userId, role }) => {
          if (userId) {
            const isStillLinked = this.storage.getProposalsListSnapshot().some(proposal =>
              (role === UserRoleType.CODIRECTOR && proposal.codirector?.id === userId) ||
              (role === UserRoleType.ASESOR && proposal.advisor?.id === userId)
            );

            if (!isStillLinked) {
              this.userService.removeRoleFromUser(userId, role);
            }
          }
        });
      })
    );
  }
}
