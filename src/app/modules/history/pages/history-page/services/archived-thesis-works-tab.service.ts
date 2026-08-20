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
    const allowedWorks = allArchived.filter((work: ThesisWork) =>
      hasArchiveAccess(work.preliminaryDraftData?.proposalData, userId, context.hasGlobalAccess)
    );

    return allowedWorks.map((work: ThesisWork) => {
      const proposal = work.preliminaryDraftData?.proposalData;
      const maxDeliveryDate = work.preliminaryDraftData?.maximumDeliveryDate;
      return {
        id: work.thesisWorkId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: work.state,
        // ← FIX: antes 'Finalizado' estático. El encabezado ya decía
        // "Plazo Máximo" (no "Plazo Evaluación" como sus dos hermanas),
        // así que el dato correcto es la fecha máxima de entrega real,
        // no un label de evaluación calculado. Confirmado contra
        // ThesisWorkPageMapperService.formatMaxDeliveryDate: este campo
        // siempre llega como Date real (viene de un p-datepicker), nunca
        // como el string "DD - MM - YYYY" — parseDisplayDate lo deja
        // pasar sin tocarlo en ese caso, formatDisplayDate solo se
        // encarga de la conversión final a texto.
        maxDeliveryDate: maxDeliveryDate
          ? formatDisplayDate(parseDisplayDate(maxDeliveryDate))
          : 'Sin fecha límite',
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      };
    });
  }
}
