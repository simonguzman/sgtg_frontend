import { inject, Injectable } from '@angular/core';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { versionVigente } from '../../../../preliminary-draft/services/preliminary-draft-rules';
import { hasArchiveAccess } from '../../../helpers/archived-record-access.helper';
import { getEvaluatorsDeadlineLabel } from '../../../helpers/deadline-status-label.helper';
import { ARCHIVED_ALLOWED_ACTIONS, buildArchivedTableColumns } from '../models/archived-tab-columns.model';

@Injectable({ providedIn: 'root' })
export class ArchivedPreliminaryDraftsTabService implements HistoryTabConfiguration {
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);

  readonly tabValue = 'ANTEPROYECTOS';
  readonly columns = buildArchivedTableColumns('deadlineStatus', 'Plazo Evaluación');

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;
    const allArchived = this.preliminaryDraftService.allPreliminaryDrafts().filter(preliminaryDraft => preliminaryDraft.isArchived === true);
    const allowedPreliminaryDrafts = allArchived.filter((preliminaryDraft: PreliminaryDraft) =>
      hasArchiveAccess(preliminaryDraft.proposalData, userId, context.hasGlobalAccess)
    );

    return allowedPreliminaryDrafts.map((preliminaryDraft: PreliminaryDraft) => {
      const proposal = preliminaryDraft.proposalData;
      // Versión vigente: la de mayor número de versión (no la primera de la lista)
      const latestAnteproyectoDocId = versionVigente(preliminaryDraft)?.id;

      return {
        id: preliminaryDraft.preliminaryDraftId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: preliminaryDraft.state,
        deadlineStatus: getEvaluatorsDeadlineLabel({
          state: preliminaryDraft.state,
          evaluationDeadline: preliminaryDraft.evaluationDeadline,
          evaluators: preliminaryDraft.evaluators,
          evaluations: preliminaryDraft.evaluations,
          documentId: latestAnteproyectoDocId
        }),
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      };
    });
  }
}
