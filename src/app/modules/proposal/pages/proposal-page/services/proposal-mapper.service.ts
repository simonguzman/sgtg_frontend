import { Injectable } from '@angular/core';
import { Proposal } from '../../../interfaces/proposal.interface';
import { ProposalTableRow } from '../models/proposal-page.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { getRemainingBusinessDays } from '../../../../../core/utils/date-utils';
import { User } from '../../../../users/interfaces/user.interface';

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
      deadlineStatus: this.getDeadlineBadge(proposal),
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

  private getDeadlineBadge(proposal: Proposal): string {
    const isEvaluated =
      proposal.state === stateList.APROBADO ||
      proposal.state === stateList.NO_APROBADO;

    if (isEvaluated) {
      const latestEvaluation = proposal.evaluations?.[0];
      return latestEvaluation?.deadlineStatus
        ? (latestEvaluation.deadlineStatus as string)
        : 'Evaluación completada';
    }

    if (!proposal.evaluationDeadline) return 'Sin límite';

    const remainingDays = getRemainingBusinessDays(proposal.evaluationDeadline);
    if (remainingDays < 0)  return `Plazo vencido (${Math.abs(remainingDays)} días hábiles de retraso)`;
    if (remainingDays === 0) return '¡Vence hoy!';
    return `Quedan ${remainingDays} días hábiles`;
  }
}
