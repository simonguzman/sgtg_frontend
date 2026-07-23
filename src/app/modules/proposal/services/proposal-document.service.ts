import { inject, Injectable } from '@angular/core';
import { delay, Observable, of, tap } from 'rxjs';
import { ProposalStorageService } from './proposal-storage.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { stateList } from '../../../core/enums/state.enum';
import { addBusinessDays, getRemainingBusinessDays } from '../../../core/utils/date-utils';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { UserService } from '../../users/services/user.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Proposal } from '../interfaces/proposal.interface';

@Injectable({
  providedIn: 'root'
})
export class ProposalDocumentService {
  private readonly storage = inject(ProposalStorageService);
  private readonly eventBus = inject(EventBusService);
  private readonly userService = inject(UserService);

  addEvaluationMock(proposalId: string, evaluation: Evaluation): Observable<Proposal> {
    const proposal = this.storage.getProposalsListSnapshot().find(proposal => proposal.id === proposalId);
    if (!proposal) throw new Error(`Propuesta con ID ${proposalId} no encontrada`);

    const remainingDays = proposal.evaluationDeadline ? getRemainingBusinessDays(proposal.evaluationDeadline) : 0;
    const timelinessStatus = remainingDays < 0 ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;

    const updatedProposal: Proposal = {
      ...proposal,
      state: evaluation.veredict,
      evaluations: [
        {
          ...evaluation,
          id: crypto.randomUUID(),
          date: new Date(),
          deadlineStatus: timelinessStatus
        },
        ...(proposal.evaluations || [])
      ],
      documents: proposal.documents?.map((document, index) =>
        index === 0 ? { ...document, status: evaluation.veredict } : document
      ) || []
    };

    return of(updatedProposal).pipe(
      delay(1000),
      tap(savedProposal => {
        this.storage.updateProposals(list => list.map(proposal => proposal.id === proposalId ? savedProposal : proposal));

        const notifyUserIds = new Set<string>();
        savedProposal.authors?.forEach(author => { if (author?.id) notifyUserIds.add(author.id); });
        if (savedProposal.director?.id) notifyUserIds.add(savedProposal.director.id);
        if (savedProposal.codirector?.id) notifyUserIds.add(savedProposal.codirector.id);
        if (savedProposal.advisor?.id) notifyUserIds.add(savedProposal.advisor.id);

        this.eventBus.emit({
          type: AppEventType.EVALUATION_ASSIGNED,
          targetUserIds: Array.from(notifyUserIds),
          payload: {
            proposalId: savedProposal.id,
            veredict: evaluation.veredict,
            proposalTitle: savedProposal.title || ''
          }
        });
      })
    );
  }

  uploadCorrectionMock(proposalId: string, newDocument: FileDocument): Observable<Proposal> {
    const proposal = this.storage.getProposalsListSnapshot().find(proposal => proposal.id === proposalId);
    if (!proposal) throw new Error(`Propuesta con ID ${proposalId} no encontrada`);

    const updatedProposal: Proposal = {
      ...proposal,
      documents: [newDocument, ...(proposal.documents || [])],
      state: stateList.EN_REVISION,
      evaluationDeadline: addBusinessDays(new Date(), 10)
    };

    return of(updatedProposal).pipe(
      delay(1200),
      tap(savedProposal => {
        this.storage.updateProposals(list => list.map(proposal => proposal.id === proposalId ? savedProposal : proposal));

        const notifyUserIds = new Set<string>();
        savedProposal.authors?.forEach(author => { if (author?.id) notifyUserIds.add(author.id); });
        if (savedProposal.director?.id) notifyUserIds.add(savedProposal.director.id);
        if (savedProposal.codirector?.id) notifyUserIds.add(savedProposal.codirector.id);
        if (savedProposal.advisor?.id) notifyUserIds.add(savedProposal.advisor.id);

        this.userService.users()
          .filter(user => user.roles.includes(UserRoleType.COMITE))
          .forEach(user => notifyUserIds.add(user.id));

        this.eventBus.emit({
          type: AppEventType.PROPOSAL_CORRECTION_UPLOADED,
          targetUserIds: Array.from(notifyUserIds),
          payload: {
            proposalId: savedProposal.id,
            proposalTitle: savedProposal.title || ''
          }
        });
      })
    );
  }
}
