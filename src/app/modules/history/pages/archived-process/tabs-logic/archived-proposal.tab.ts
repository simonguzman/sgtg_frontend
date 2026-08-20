import { Injectable, inject } from '@angular/core';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { Column } from '../../../../../shared/components/table-component/table-component.component';

@Injectable({
  providedIn: 'root'
})
export class ArchivedProposalsTabService implements HistoryTabConfiguration {
  readonly tabValue = 'PROPUESTAS';

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

  // Inyección nativa y limpia (Principio SOLID: Inversión de Dependencias)
  private readonly proposalService = inject(ProposalService);
  private readonly userService = inject(UserService);

  getTableData(context: HistoryEvaluationContext): Record<string, unknown>[] {
    const userId = context.currentUser?.id;

    // Asumimos que allProposals() es un Signal como en el servicio anterior
    const allArchived = this.proposalService.allProposals().filter((proposal: Proposal) => proposal.isArchived === true);

    const allowedProposals = allArchived.filter((proposal: Proposal) => {
      if (context.hasGlobalAccess) return true;

      const isAuthor = proposal.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
      const isDirector = proposal.director?.id === userId;
      const isCodirector = proposal.codirector?.id === userId;
      const isAdvisor = proposal.advisor?.id === userId;

      return isAuthor || isDirector || isCodirector || isAdvisor;
    });

    return allowedProposals.map((proposal: Proposal) => {
      return {
        id: proposal.id,
        title: proposal.title || 'Sin título',
        modality: proposal.modality || 'No definida',
        authors: this.userService.getAuthorsNames(proposal.authors) || 'Sin asignar',
        description: proposal.description || 'Sin descripción',
        state: proposal.state,
        deadlineStatus: 'Finalizado',
        allowedActions: ['ver descripcion', 'ver']
      };
    });
  }
}
