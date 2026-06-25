import { inject, runInInjectionContext } from '@angular/core'; // <-- Importación añadida
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
// 💡 Ajusta estos imports a la ruta real


export const ArchivedPreliminaryDraftsTabConfig: HistoryTabConfiguration = {
  tabValue: 'ANTEPROYECTOS',

  columns: [
    { field: 'title', header: 'Título del Anteproyecto', type: 'text', width: '35%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '25%' },
    { field: 'evaluators', header: 'Evaluadores', type: 'text', width: '20%' },
    { field: 'status', header: 'Estado Final', type: 'state', width: '10%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '10%',
      actions: [
        {
          action: 'view-details',
          label: 'Ver Evaluaciones y Documentos',
          icon: 'visibility',
          variant: 'primary',
          disabled: false
        }
      ]
    }
  ],

  getTableData: (context: HistoryEvaluationContext): Record<string, unknown>[] => {
    // 👇 Envolvemos la lógica 👇
    return runInInjectionContext(context.injector, () => {

      const draftService = inject(PreliminaryDraftService);
      const userService = inject(UserService);
      const userId = context.currentUser?.id;

      // 1. Filtrar archivados
      const allArchived = draftService.preliminaryDrafts().filter(d => d.isArchived === true);

      // 2. Visibilidad: Autores, Director, Codirector, Asesor y Evaluadores
      const allowedDrafts = allArchived.filter((draft: PreliminaryDraft) => {
        if (context.isAdmin) return true;

        const proposal = draft.proposalData;

        const isAuthor = proposal?.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
        const isDirector = proposal?.director?.id === userId;
        const isCodirector = proposal?.codirector?.id === userId;
        const isAdvisor = proposal?.advisor?.id === userId;
        // Nueva regla: Si fue evaluador, puede ver el registro
        const isEvaluator = draft.evaluators?.some(evaluator => evaluator.id === userId);

        return isAuthor || isDirector || isCodirector || isAdvisor || isEvaluator;
      });

      // 3. Mapear a formato plano
      return allowedDrafts.map((draft: PreliminaryDraft) => {
        const proposal = draft.proposalData;

        return {
          id: draft.preliminaryDraftId,
          title: proposal?.title || 'Sin título',
          authors: userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
          evaluators: draft.evaluators ? draft.evaluators.map(e => `${e.firstName} ${e.lastName}`).join(', ') : 'Sin asignar',
          status: draft.state,
          allowedActions: ['view-details']
        };
      });

    }); // 👆 Cierre de runInInjectionContext 👆
  }
};
