import { stateList } from '../../../../../core/enums/state.enum';
import { Injectable } from '@angular/core';
import { Proposal } from '../../../interfaces/proposal.interface';
import { ProposalTableRow } from '../models/proposal-page.model';
import { User } from '../../../../users/interfaces/user.interface';
import { propuestaEditable } from '../../../services/proposal-rules.service';
import { getSingleEvaluationDeadlineLabel } from '../../../../history/helpers/deadline-status-label.helper';

@Injectable({ providedIn: 'root' })
export class ProposalMapperService {
  /**
   * @param annullable true si el trabajo está en una etapa en la que se puede anular; sin el dato del backend, mientras
   *        la propuesta no esté aprobada
   */
  public mapProposalToTable(
    proposal: Proposal,
    currentUserId: string | undefined,
    annullable = proposal.state !== stateList.APROBADO
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
        proposal.evaluationRemainingDays,
        // Las decisiones del Comité van de la más antigua a la más reciente
        proposal.evaluations?.[proposal.evaluations.length - 1]
      ),
      hiddenParticipants: this.buildHiddenParticipants(proposal),
      allowedActions: [
        'ver descripcion', 'ver',
        ...(canEdit ? ['editar'] : []),
        // El director anula antes de la aprobación del Consejo
        ...(proposal.director?.id === currentUserId && annullable ? ['anular'] : [])
      ]
    };
  }

  private buildHiddenParticipants(proposal: Proposal): string {
    return [proposal.director, proposal.codirector, proposal.advisor, ...(proposal.authors || [])]
      .filter((user): user is User => !!user && typeof user === 'object')
      .map(user => `${user.firstName || ''} ${user.lastName || ''}`.trim())
      .join(' ');
  }
}
