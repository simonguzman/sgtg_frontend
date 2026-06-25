import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { inject, runInInjectionContext } from '@angular/core'; // <-- Importación añadida
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';

export const ArchivedThesisWorksTabConfig: HistoryTabConfiguration = {
  tabValue: 'TRABAJOS',

  columns: [
    { field: 'title', header: 'Título del Trabajo', type: 'text', width: '35%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '25%' },
    { field: 'archivedDate', header: 'Fecha de Cierre', type: 'text', width: '15%' },
    { field: 'status', header: 'Estado Final', type: 'state', width: '15%' },
    {
      field: 'acciones', header: 'Acciones', type: 'actions', width: '10%',
      actions: [
        {
          action: 'view-details',
          label: 'Ver Historial Completo',
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

      const thesisWorkService = inject(ThesisWorkService);
      const userService = inject(UserService);

      const userId = context.currentUser?.id;

      // 1. Filtrar solo los registros que tengan la bandera `isArchived` en true
      const allArchived = thesisWorkService.thesisWorks().filter(work => work.isArchived === true);

      // 2. Aplicar Regla de Visibilidad
      const allowedWorks = allArchived.filter((work: ThesisWork) => {
        if (context.isAdmin) return true;

        const proposal = work.preliminaryDraftData?.proposalData;

        const isAuthor = proposal?.authors?.some(auth => (typeof auth === 'string' ? auth : auth.id) === userId);
        const isDirector = proposal?.director?.id === userId;
        const isCodirector = proposal?.codirector?.id === userId;
        const isAdvisor = proposal?.advisor?.id === userId;
        const isJuror = work.sustentations?.[0]?.assignedJurors?.some(juror => juror.id === userId);

        return isAuthor || isDirector || isCodirector || isAdvisor || isJuror;
      });

      // 3. Mapear al formato plano
      return allowedWorks.map((work: ThesisWork) => {
        const proposal = work.preliminaryDraftData?.proposalData;
        const dateStr = work.archivedAt
          ? new Date(work.archivedAt).toLocaleDateString('es-ES')
          : new Date(work.createdDate).toLocaleDateString('es-ES');

        return {
          id: work.thesisWorkId,
          title: proposal?.title || 'Sin título',
          authors: userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',
          archivedDate: dateStr,
          status: work.state,
          allowedActions: ['view-details']
        };
      });

    }); // 👆 Cierre de runInInjectionContext 👆
  }
};
