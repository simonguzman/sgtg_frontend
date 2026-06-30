import { inject, runInInjectionContext } from '@angular/core';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext, HistoryTabConfiguration } from '../../../interfaces/history-tab-config.interface';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';

export const ArchivedThesisWorksTabConfig: HistoryTabConfiguration = {
  tabValue: 'TRABAJOS',

  // 1. Estandarizamos las columnas para que sean idénticas a las de Anteproyectos y vista principal
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
    { field: 'maxDeliveryDate', header: 'Plazo Máximo', type: 'text', width: '10%' },
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
      const thesisWorkService = inject(ThesisWorkService);
      const userService = inject(UserService);
      const userId = context.currentUser?.id;

      if (!thesisWorkService || !userService) return [];

      // 1. Filtrar archivados
      const allArchived = thesisWorkService.allThesisWorks().filter(thesisWork => thesisWork.isArchived === true);

      // 2. Visibilidad: Autores, Director, Codirector, Asesor y Jurados
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

      // 3. Mapear a formato plano alimentando exactamente las columnas definidas
      return allowedWorks.map((work: ThesisWork) => {
        const proposal = work.preliminaryDraftData?.proposalData;

        return {
          id: work.thesisWorkId,
          title: proposal?.title || 'Sin título',
          modality: proposal?.modality || 'No definida',
          authors: userService.getAuthorsNames(proposal?.authors) || 'Sin asignar',

          description: proposal?.description || 'Sin descripción',
          state: work.state,
          maxDeliveryDate: 'Finalizado', // Texto estático para historial

          // Permisos para los botones mapeados en la tabla
          allowedActions: ['ver descripcion', 'ver']
        };
      });
    });
  }
};
