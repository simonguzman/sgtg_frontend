import { inject, Injectable } from '@angular/core';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { hasArchiveAccess } from '../../../helpers/archived-record-access.helper';
import { getSingleEvaluationDeadlineLabel } from '../../../helpers/deadline-status-label.helper';
import { ARCHIVED_ALLOWED_ACTIONS, buildArchivedTableColumns } from '../models/archived-tab-columns.model';

@Injectable({ providedIn: 'root' })
export class ArchivedProposalsTabService implements HistoryTabConfiguration {
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);

  readonly tabValue = 'PROPUESTAS';
  readonly columns = buildArchivedTableColumns('deadlineStatus', 'Plazo Evaluación');

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;
    const allArchived = this.proposalService.allProposals().filter((p) => p.isArchived === true);
    const allowedProposals = allArchived.filter((proposal: Proposal) =>
      hasArchiveAccess(proposal, userId, context.hasGlobalAccess)
    );

    return allowedProposals.map((proposal: Proposal) => ({
      id: proposal.id,
      title: proposal.title || 'Sin título',
      modality: proposal.modality || 'No definida',
      authors: this.userService.getAuthorsNames(proposal.authors) || 'Sin asignar',
      description: proposal.description || 'Sin descripción',
      state: proposal.state,
      deadlineStatus: getSingleEvaluationDeadlineLabel(
        proposal.state,
        proposal.evaluationDeadline,
        proposal.evaluations?.[0]
      ),
      allowedActions: ARCHIVED_ALLOWED_ACTIONS
    }));
  }
}
