import { Routes } from '@angular/router';
import { HistoryPageComponent } from './pages/history-page/history-page.component';
import { ProposalDetailsPageComponent } from '../proposal/pages/proposal-details-page/proposal-details-page.component';
import { LoadedProposalsPageComponent } from '../proposal/pages/loaded-proposals-page/loaded-proposals-page.component';
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';
import { EvaluationProposalPageComponent } from '../proposal/pages/evaluation-proposal-page/evaluation-proposal-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/models/user-role';

const ALL_ROLES = [
  UserRoleType.ADMINISTRADOR,
  UserRoleType.DIRECTOR,
  UserRoleType.CODIRECTOR,
  UserRoleType.ASESOR,
  UserRoleType.ESTUDIANTE,
  UserRoleType.COMITE
];

export const historyRoutes: Routes = [
  {
    // Ruta base: /history
    path: '',
    data: { breadcrumb: 'Historial' },
    children: [
      {
        path: '',
        component: HistoryPageComponent,
        title: 'Propuestas de trabajo de grado archivadas',
        data: { breadcrumb: null }
      },
      {
        // Nivel 1 (tab): siempre activo para CUALQUIER subruta de proposal-details/:id,
        // porque es el padre directo de todas ellas — igual que 'Propuestas'
        // en el nivel raíz de proposal.routes.ts.
        path: 'proposal-details/:id',
        data: { breadcrumb: 'Propuestas Archivadas' },
        children: [
          {
            // 👈 NUEVO wrapper intermedio (no consume segmento de URL).
            // Necesario porque "Propuestas Archivadas" (nivel del tab) y
            // "Detalle de la propuesta archivada" (nivel del detalle) son
            // DOS etiquetas distintas que en proposal.routes.ts viven
            // colapsadas en un único wrapper ('Información de la propuesta').
            // Aquí necesitamos dos niveles separados, así que cada uno
            // necesita su propio wrapper para que ambos permanezcan en la
            // cadena activa sin importar qué hijo final esté navegado.
            path: '',
            data: { breadcrumb: 'Detalle de la propuesta archivada' },
            children: [
              {
                path: '', // Ruta por defecto (carga el detalle)
                component: ProposalDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Información de la propuesta',
                data: { breadcrumb: null, roles: ALL_ROLES },
              },
              {
                path: 'evaluations_performed',
                component: EvaluationsPerformedPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluaciones realizadas',
                data: { breadcrumb: 'Evaluaciones realizadas', roles: ALL_ROLES }
              },
              {
                path: 'loaded_proposals',
                data: { breadcrumb: 'Propuestas cargadas' },
                children: [
                  {
                    path: '',
                    component: LoadedProposalsPageComponent,
                    canActivate: [roleGuard],
                    title: 'Propuestas cargadas',
                    data: { breadcrumb: null, roles: ALL_ROLES }
                  },
                  {
                    path: 'evaluate_proposal',
                    component: EvaluationProposalPageComponent,
                    canActivate: [roleGuard],
                    title: 'Evaluar propuesta',
                    data: { breadcrumb: 'Evaluar propuesta', roles: [UserRoleType.ADMINISTRADOR, UserRoleType.COMITE] }
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  },
];
