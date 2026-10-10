import { Injectable } from '@angular/core';
import { Proposal } from '../../../interfaces/proposal.interface';
import { ProposalTableRow } from '../models/proposal-page.model';
import { User } from '../../../../users/interfaces/user.interface';
import { propuestaEditable } from '../../../services/proposal-rules.service';
import { getSingleEvaluationDeadlineLabel } from '../../../../history/helpers/deadline-status-label.helper';

@Injectable({ providedIn: 'root' })
export class ProposalMapperService {
  public mapProposalToTable(
    proposal: Proposal,
    currentUserId: string | undefined
  ): ProposalTableRow {
    // Solo el director corrige su propuesta, y solo cuando el estado lo permite
    const canEdit = proposal.director?.id === currentUserId && propuestaEditable(proposal);
    return {
      id: proposal.id,
      title: proposal.title,
      modality: proposal.modality,
      description: proposal.description,
      state: proposal.state,
      deadlineStatus: getSingleEvaluationDeadlineLabel(
        proposal.state,
        proposal.evaluationDeadline,
        proposal.evaluations?.[0]
      ),
      hiddenParticipants: this.buildHiddenParticipants(proposal),
      allowedActions: canEdit
        ? ['ver descripcion', 'ver', 'editar']
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
