import { inject, Injectable } from '@angular/core';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { hasArchiveAccess } from '../../../helpers/archived-record-access.helper';
import { getEvaluatorsDeadlineLabel } from '../../../helpers/deadline-status-label.helper';
import { ARCHIVED_ALLOWED_ACTIONS, buildArchivedTableColumns } from '../models/archived-tab-columns.model';

@Injectable({ providedIn: 'root' })
export class ArchivedPreliminaryDraftsTabService implements HistoryTabConfiguration {
  private readonly draftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);

  readonly tabValue = 'ANTEPROYECTOS';
  readonly columns = buildArchivedTableColumns('deadlineStatus', 'Plazo Evaluación');

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;
    const allArchived = this.draftService.allPreliminaryDrafts().filter(d => d.isArchived === true);
    const allowedDrafts = allArchived.filter((draft: PreliminaryDraft) =>
      hasArchiveAccess(draft.proposalData, userId, context.hasGlobalAccess)
    );

    return allowedDrafts.map((draft: PreliminaryDraft) => {
      const proposal = draft.proposalData;
      // ← FIX: antes draft.documents?.[0]?.id — asumía por índice que el
      // documento más reciente era el anteproyecto/corrección. Como
      // uploadDocumentMock hace unshift() para CUALQUIER tipo (incluido
      // FORMATO_C), si la presentación al consejo se subió después de la
      // última corrección, documents[0] pasaba a ser el FORMATO_C — un id
      // que ninguna evaluación de evaluador referencia, dejando el label
      // sin el sufijo "(EN_PLAZO/RETRASO)".
      const latestAnteproyectoDocId = draft.documents?.find(
        document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION
      )?.id;

      return {
        id: draft.preliminaryDraftId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: draft.state,
        deadlineStatus: getEvaluatorsDeadlineLabel({
          state: draft.state,
          evaluationDeadline: draft.evaluationDeadline,
          evaluators: draft.evaluators,
          evaluations: draft.evaluations,
          documentId: latestAnteproyectoDocId
        }),
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      };
    });
  }
}
