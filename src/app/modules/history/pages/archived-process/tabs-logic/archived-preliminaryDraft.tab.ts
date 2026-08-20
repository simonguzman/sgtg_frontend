import { Injectable, inject } from '@angular/core';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { Column } from '../../../../../shared/components/table-component/table-component.component';

@Injectable({
  providedIn: 'root'
})
export class ArchivedPreliminaryDraftsTabService implements HistoryTabConfiguration {
  readonly tabValue = 'ANTEPROYECTOS';

  readonly columns: Column[] = [
    { field: 'title', header: 'Titulo', type: 'text', width: '25%' },
    { field: 'modality', header: 'Modalidad', type: 'text', width: '15%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '20%' },
    {
      field: 'description',
      header: 'Descripción',
      type: 'actions',
      actions: [{ action: 'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false }],
      width: '10%'
    },
    { field: 'state', header: 'Estado', type: 'state', width: '10%' },
    { field: 'deadlineStatus', header: 'Plazo Evaluación', type: 'text', width: '10%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions', width: '10%',
      actions: [
        { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false }
      ]
    }
  ];

  // Inyección de dependencias nativa y limpia
  private readonly draftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;

    const allArchived = this.draftService.allPreliminaryDrafts().filter(d => d.isArchived === true);

    const allowedDrafts = allArchived.filter((draft: PreliminaryDraft) => {
      if (context.hasGlobalAccess) return true;

      const proposal = draft.proposalData;
      if (!proposal) return false;

      const isAuthor = proposal.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
      const isDirector = proposal.director?.id === userId;
      const isCodirector = proposal.codirector?.id === userId;
      const isAdvisor = proposal.advisor?.id === userId;

      return isAuthor || isDirector || isCodirector || isAdvisor;
    });

    return allowedDrafts.map((preliminaryDraft: PreliminaryDraft) => {
      const proposal = preliminaryDraft.proposalData;

      return {
        id: preliminaryDraft.preliminaryDraftId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: preliminaryDraft.state,
        deadlineStatus: 'Finalizado',
        allowedActions: ['ver descripcion', 'ver']
      };
    });
  }
}
