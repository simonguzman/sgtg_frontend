import { inject, Injectable } from '@angular/core';
import { delay, map, Observable, of, tap } from 'rxjs';

// --- Sub-servicios Especializados ---
import { ProposalStorageService } from './proposal-storage.service';
import { ProposalRulesService } from './proposal-rules.service';
import { ProposalDocumentService } from './proposal-document.service';

import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { Document } from '../../../core/interfaces/Document.interface';
import { UserRoleType } from '../../../core/models/user-role';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays } from '../../../core/utils/date-utils';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';

@Injectable({
  providedIn: 'root'
})
export class ProposalService {
  private readonly storage = inject(ProposalStorageService);
  private readonly rulesService = inject(ProposalRulesService);
  private readonly documentService = inject(ProposalDocumentService);
  private readonly userService = inject(UserService);
  private readonly eventBus = inject(EventBusService);

  readonly proposals = this.storage.proposals;

  getProposalByIdMock(id: string): Observable<Proposal | undefined> {
    return this.storage.getById(id);
  }

  createProposalMock(proposal: Proposal): Observable<Proposal> {
    const nowDate = new Date;
    const deadlineDate = addBusinessDays(nowDate, 10);
    const newProposal: Proposal = {
      ...proposal,
      id: Math.random().toString(36).substring(2, 11),
      createdAt: nowDate,
      evaluationDeadline: deadlineDate,
      state: stateList.EN_REVISION,
      documents: proposal.documents ? proposal.documents.map(doc => ({
        ...doc,
        id: doc.id || Date.now().toString()
      })) : [],
      evaluations: []
    };

    return of(newProposal).pipe(
      delay(1000),
      tap(onSaved => {
        this.storage.updateProposals(current => [onSaved, ...current]);

        if (onSaved.director) this.userService.addRoleToUser(onSaved.director.id, UserRoleType.DIRECTOR);
        if (onSaved.codirector) this.userService.addRoleToUser(onSaved.codirector.id, UserRoleType.CODIRECTOR);
        if (onSaved.advisor) this.userService.addRoleToUser(onSaved.advisor.id, UserRoleType.ASESOR);

        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CREATED,
          payload: {id: onSaved.id, title: onSaved.title}
        });
      })
    );
  }

  updateProposalMock(id: string, changes: Partial<Proposal>): Observable<Proposal> {
    const oldProposal = this.storage.getProposalsListSnapshot().find(p => p.id === id);

    return of(null).pipe(
      delay(1000),
      tap(() => {
        if (!oldProposal) return;

        this.rulesService.handleRoleExchange(oldProposal.codirector?.id, changes.codirector?.id, UserRoleType.CODIRECTOR, id);
        this.rulesService.handleRoleExchange(oldProposal.advisor?.id, changes.advisor?.id, UserRoleType.ASESOR, id);

        this.storage.updateProposals(list =>
          list.map(p => (p.id === id ? { ...p, ...changes } : p))
        );
      }),
      map(() => this.storage.getProposalsListSnapshot().find(p => p.id === id)!)
    );
  }

  deleteProposalMock(id: string): Observable<void> {
    const proposalToRemove = this.storage.getProposalsListSnapshot().find(p => p.id === id);

    return of(undefined).pipe(
      delay(1000),
      tap(() => {
        if (!proposalToRemove) return;

        this.storage.updateProposals(list => list.filter(p => p.id !== id));

        const rolesToCheck = [
          { id: proposalToRemove.codirector?.id, role: UserRoleType.CODIRECTOR },
          { id: proposalToRemove.advisor?.id, role: UserRoleType.ASESOR }
        ];

        rolesToCheck.forEach(({ id: userId, role }) => {
          if (userId) {
            const isStillLinked = this.storage.getProposalsListSnapshot().some(p =>
              (role === UserRoleType.CODIRECTOR && p.codirector?.id === userId) ||
              (role === UserRoleType.ASESOR && p.advisor?.id === userId)
            );

            if (!isStillLinked) {
              this.userService.removeRoleFromUser(userId, role);
            }
          }
        });
      })
    );
  }

  validateProposalRules(proposal: Partial<Proposal>): string | null {
    return this.rulesService.validateProposalRules(proposal);
  }

  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<void> {
    return this.documentService.addEvaluationMock(proposalId, evaluation);
  }

  uploadCorrectionMock(proposalId: string, newDoc: Document): Observable<void> {
    return this.documentService.uploadCorrectionMock(proposalId, newDoc);
  }

  getDocumentsByProposalId(id: string): Document[] {
    const proposal = this.storage.getProposalsListSnapshot().find(p => p.id === id);
    return proposal ? proposal.documents : [];
  }
}
