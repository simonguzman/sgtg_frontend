import { Injectable, inject } from '@angular/core';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { Column } from '../../../../../shared/components/table-component/table-component.component';

@Injectable({
  providedIn: 'root'
})
export class ArchivedThesisWorksTabService implements HistoryTabConfiguration {
  readonly tabValue = 'TRABAJOS';

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
    { field: 'maxDeliveryDate', header: 'Plazo Máximo', type: 'text', width: '10%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions', width: '10%',
      actions: [
        { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false }
      ]
    }
  ];

  // Inyección de dependencias nativa y limpia (Principio SOLID: DIP)
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;

    const allArchived = this.thesisWorkService.allThesisWorks().filter(thesisWork => thesisWork.isArchived === true);

    const allowedWorks = allArchived.filter((work: ThesisWork) => {
      if (context.hasGlobalAccess) return true;

      const proposal = work.preliminaryDraftData?.proposalData;
      if (!proposal) return false;

      const isAuthor = proposal.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
      const isDirector = proposal.director?.id === userId;
      const isCodirector = proposal.codirector?.id === userId;
      const isAdvisor = proposal.advisor?.id === userId;

      return isAuthor || isDirector || isCodirector || isAdvisor;
    });

    return allowedWorks.map((work: ThesisWork) => {
      const proposal = work.preliminaryDraftData?.proposalData;

      return {
        id: work.thesisWorkId,
        title: proposal?.title || 'Sin título',
        modality: proposal?.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
        description: proposal?.description || 'Sin descripción',
        state: work.state,
        maxDeliveryDate: 'Finalizado',
        allowedActions: ['ver descripcion', 'ver']
      };
    });
  }
}
