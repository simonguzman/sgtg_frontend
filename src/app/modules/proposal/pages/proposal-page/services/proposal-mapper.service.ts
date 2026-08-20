import { Injectable } from '@angular/core';
import { Proposal } from '../../../interfaces/proposal.interface';
import { ProposalTableRow } from '../models/proposal-page.model';
import { User } from '../../../../users/interfaces/user.interface';
import { getSingleEvaluationDeadlineLabel } from '../../../../history/helpers/deadline-status-label.helper';

@Injectable({ providedIn: 'root' })
export class ProposalMapperService {
  public mapProposalToTable(
    proposal: Proposal,
    isAdmin: boolean,
    currentUserId: string | undefined
  ): ProposalTableRow {
    const isOwner = proposal.director?.id === currentUserId;
    return {
      id: proposal.id,
      title: proposal.title,
      modality: proposal.modality,
      description: proposal.description,
      state: proposal.state,
      // ← Delegado al helper compartido en vez de calcularlo inline
      deadlineStatus: getSingleEvaluationDeadlineLabel(
        proposal.state,
        proposal.evaluationDeadline,
        proposal.evaluations?.[0]
      ),
      hiddenParticipants: this.buildHiddenParticipants(proposal),
      allowedActions: (isAdmin || isOwner)
        ? ['ver descripcion', 'ver', 'editar', 'eliminar']
        : ['ver descripcion', 'ver']
    };
  }

  private buildHiddenParticipants(proposal: Proposal): string {
    return [proposal.director, proposal.codirector, proposal.advisor, ...(proposal.authors || [])]
      .filter((user): user is User => !!user && typeof user === 'object')
      .map(user => `${user.firstName || ''} ${user.lastName || ''}`.trim())
      .join(' ');
  }
}
