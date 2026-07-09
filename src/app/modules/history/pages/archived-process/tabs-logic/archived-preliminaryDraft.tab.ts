import { inject, runInInjectionContext } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';

export const ArchivedPreliminaryDraftsTabConfig: HistoryTabConfiguration = {
  tabValue: 'ANTEPROYECTOS',

  // 1. Estandarizamos las columnas para que sean idénticas a las de Propuestas
  columns: [
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
        // Usamos la acción 'ver' con el icono de ojo para mantener la consistencia
        { action: 'ver', icon: 'visibility', variant: 'primary', disabled: false }
      ]
    }
  ],

  getTableData: (context: HistoryEvaluationContext): Record<string, unknown>[] => {
    return runInInjectionContext(context.injector, () => {
      const draftService = inject(PreliminaryDraftService);
      const userService = inject(UserService);
      const userId = context.currentUser?.id;

      if (!draftService || !userService) return [];

      // 1. Filtrar archivados
      const allArchived = draftService.allPreliminaryDrafts().filter(d => d.isArchived === true);

      const allowedDrafts = allArchived.filter((draft: PreliminaryDraft) => {
        if (context.hasGlobalAccess) return true; // 👈 ACTUALIZADO

        const proposal = draft.proposalData;

        const isAuthor = proposal?.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
        const isDirector = proposal?.director?.id === userId;
        const isCodirector = proposal?.codirector?.id === userId;
        const isAdvisor = proposal?.advisor?.id === userId;

        // ❌ ELIMINADO: const isEvaluator = ...

        return isAuthor || isDirector || isCodirector || isAdvisor; // 👈 ACTUALIZADO
      });

      // 3. Mapear a formato plano alimentando exactamente las columnas definidas
      return allowedDrafts.map((preliminaryDraft: PreliminaryDraft) => {
        const proposal = preliminaryDraft.proposalData;

        return {
          id: preliminaryDraft.preliminaryDraftId,
          title: proposal?.title || 'Sin título',
          modality: proposal?.modality || 'No definida',
          authors: userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',

          description: proposal?.description || 'Sin descripción',
          state: preliminaryDraft.state, // Se empareja con la columna 'state'
          deadlineStatus: 'Finalizado', // Texto estático para historial

          // Permisos para los botones mapeados en la tabla
          allowedActions: ['ver descripcion', 'ver']
        };
      });
    });
  }
};
