import { inject, Injectable } from '@angular/core';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { hasArchiveAccess } from '../../../helpers/archived-record-access.helper';
import { formatDisplayDate, parseDisplayDate } from '../../../../../core/utils/date-utils';
import { ARCHIVED_ALLOWED_ACTIONS, buildArchivedTableColumns } from '../models/archived-tab-columns.model';

@Injectable({ providedIn: 'root' })
export class ArchivedThesisWorksTabService implements HistoryTabConfiguration {
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);

  readonly tabValue = 'TRABAJOS';
  readonly columns = buildArchivedTableColumns('maxDeliveryDate', 'Plazo Máximo');

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;
    const allArchived = this.thesisWorkService.allThesisWorks().filter(t => t.isArchived === true);
    const allowedThesisWorks = allArchived.filter((thesisWork: ThesisWork) =>
      hasArchiveAccess(thesisWork.preliminaryDraftData?.proposalData, userId, context.hasGlobalAccess)
    );

    return allowedThesisWorks.map((thesisWork: ThesisWork) => {
      const proposal = thesisWork.preliminaryDraftData?.proposalData;
      const maxDeliveryDate = thesisWork.preliminaryDraftData?.maximumDeliveryDate;
      return {
        id: thesisWork.thesisWorkId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: thesisWork.state,
        maxDeliveryDate: maxDeliveryDate
          ? formatDisplayDate(parseDisplayDate(maxDeliveryDate))
          : 'Sin fecha límite',
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      };
    });
  }
}
