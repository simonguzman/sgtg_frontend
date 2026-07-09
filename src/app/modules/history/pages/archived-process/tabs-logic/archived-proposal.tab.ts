import { inject, runInInjectionContext } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';

export const ArchivedProposalsTabConfig: HistoryTabConfiguration = {
  tabValue: 'PROPUESTAS',

  // 1. Columnas idénticas al módulo de Propuestas + la columna Estudiantes
  columns: [
    { field: 'title', header: 'Titulo', type: 'text', width: '25%' },
    { field: 'modality', header: 'Modalidad', type: 'text', width: '15%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '20%' }, // Te sugiero mantenerla, en estadísticas es muy útil
    {
      field: 'description',
      header: 'Descripción',
      type: 'actions',
      actions: [{action:'ver descripcion', label: 'Ver descripcion', variant: 'primary', disabled: false}],
      width: '10%'
    },
    { field: 'state', header: 'Estado', type: 'state', width: '10%' },
    { field: 'deadlineStatus', header: 'Plazo Evaluación', type: 'text', width: '10%' },
    {
      field: 'acciones',
      header: 'Acciones',
      type: 'actions', width: '10%',
      actions: [
        // Cambiamos 'view-details' por 'ver' para que sea idéntico al módulo principal
        { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false }
        // No incluimos 'editar' ni 'eliminar' porque es el historial
      ]
    }
  ],

  getTableData: (context: HistoryEvaluationContext): Record<string, unknown>[] => {
    const proposalService = context.proposalService;
    const userService = context.userService;
    const userId = context.currentUser?.id;

    if (!proposalService || !userService) return [];

    const allArchived = proposalService.allProposals().filter((proposal: Proposal) => proposal.isArchived === true);

    const allowedProposals = allArchived.filter((proposal: Proposal) => {
      if (context.hasGlobalAccess) return true; // 👈 ACTUALIZADO

      const isAuthor = proposal.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
      const isDirector = proposal.director?.id === userId;
      const isCodirector = proposal.codirector?.id === userId;
      const isAdvisor = proposal.advisor?.id === userId;

      return isAuthor || isDirector || isCodirector || isAdvisor;
    });

    // 2. Mapear a formato plano alimentando las nuevas columnas
    return allowedProposals.map((proposal: Proposal) => {
      return {
        id: proposal.id,
        title: proposal.title || 'Sin título',
        modality: proposal.modality || 'No definida',
        authors: userService.getAuthorsNames(proposal.authors) || 'Sin asignar',

        // Nuevos campos agregados para igualar la tabla
        description: proposal.description || 'Sin descripción',
        state: proposal.state, // Ajustado de 'status' a 'state'
        deadlineStatus: 'Finalizado', // Como es historial, el plazo ya no aplica
        allowedActions: ['ver descripcion', 'ver'] // Solo permitimos ver detalles y descripción
      };
    });
  }
};
