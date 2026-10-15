import { Routes } from '@angular/router';
import { HistoryPageComponent } from './pages/history-page/history-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/enums/user-role-type.enum';
import { ProposalDetailsPageComponent } from '../proposal/pages/proposal-details-page/proposal-details-page.component';
import { LoadedProposalsPageComponent } from '../proposal/pages/loaded-proposals-page/loaded-proposals-page.component';
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';
import { PreliminaryDraftDetailsPageComponent } from '../preliminary-draft/pages/preliminary-draft-details-page/preliminary-draft-details-page.component';
import { LoadedDocumentsPreliminaryDraftPageComponent } from '../preliminary-draft/pages/loaded-documets-preliminary-draft-page/loaded-documents-preliminary-draft-page.component';
import { ThesisWorkDetailsPageComponent } from '../thesis-work/pages/thesis-work-details-page/thesis-work-details-page.component';
import { LoadedDocumentsThesisWorkPageComponent } from '../thesis-work/pages/loaded-documents-thesis-work-page/loaded-documents-thesis-work-page.component';
import { SustentationDetailsPageComponent } from '../thesis-work/pages/sustentation-details-page/sustentation-details-page.component';
import { CorrectedDocumentsPageComponent } from '../thesis-work/pages/corrected-documents-page/corrected-documents-page.component';
import { archivedWorkGuard } from '../../core/guards/archived-work.guard';

/** Participantes y roles de consulta general; los evaluadores y jurados no acceden al historial. */
const ALL_ROLES = [
  UserRoleType.ADMINISTRADOR,
  UserRoleType.DIRECTOR,
  UserRoleType.CODIRECTOR,
  UserRoleType.ASESOR,
  UserRoleType.ESTUDIANTE,
  UserRoleType.COMITE,
  UserRoleType.JEFE_DEP,
  UserRoleType.CONSEJO,
  UserRoleType.DECANATURA
];

/** El evaluador consulta en su historial los anteproyectos que ya evaluó. */
const ROLES_ANTEPROYECTO = [...ALL_ROLES, UserRoleType.EVALUADOR];

export const historyRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Historial' },
    children: [
      {
        path: '',
        component: HistoryPageComponent,
        title: 'Historial',
        data: { breadcrumb: null }
      },

      // ==========================================
      // 1. RAMA DE PROPUESTAS ARCHIVADAS
      // ==========================================
      {
        path: 'proposal-details/:id',
        canActivate: [archivedWorkGuard],
        data: { breadcrumb: 'Propuesta' },
        children: [
          {
            path: '',
            data: { breadcrumb: 'Detalle de la propuesta' },
            children: [
              {
                path: '',
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
                  }
                ]
              }
            ]
          }
        ]
      },

      // ==========================================
      // 2. RAMA DE ANTEPROYECTOS ARCHIVADOS
      // ==========================================
      {
        path: 'preliminary-draft-details/:id',
        canActivate: [archivedWorkGuard],
        data: { breadcrumb: 'Anteproyecto' },
        children: [
          {
            path: '',
            data: { breadcrumb: 'Detalle del anteproyecto' },
            children: [
              {
                path: '',
                component: PreliminaryDraftDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Información del anteproyecto',
                data: { breadcrumb: null, roles: ROLES_ANTEPROYECTO }
              },
              {
                path: 'evaluations_performed',
                component: EvaluationsPerformedPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluaciones realizadas',
                data: { breadcrumb: 'Evaluaciones realizadas', roles: ROLES_ANTEPROYECTO }
              },
              {
                path: 'loaded_documents',
                data: { breadcrumb: 'Documentos cargados' },
                children: [
                  {
                    path: '',
                    component: LoadedDocumentsPreliminaryDraftPageComponent,
                    canActivate: [roleGuard],
                    title: 'Documentos cargados',
                    data: { breadcrumb: null, roles: ROLES_ANTEPROYECTO }
                  },
                ]
              }
            ]
          }
        ]
      },

      // ==========================================
      // 3. RAMA DE TRABAJOS DE GRADO ARCHIVADOS
      // ==========================================
      {
        path: 'thesis-work-details/:id',
        canActivate: [archivedWorkGuard],
        data: { breadcrumb: 'Trabajo de grado' },
        children: [
          {
            path: '',
            data: { breadcrumb: 'Detalle del trabajo de grado' },
            children: [
              {
                path: '',
                component: ThesisWorkDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Información del trabajo de grado',
                data: { breadcrumb: null, roles: ALL_ROLES }
              },
              {
                path: 'evaluations_performed',
                component: EvaluationsPerformedPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluaciones realizadas',
                data: { breadcrumb: 'Evaluaciones realizadas', roles: ALL_ROLES }
              },
              {
                path: 'loaded_documents',
                component: LoadedDocumentsThesisWorkPageComponent,
                canActivate: [roleGuard],
                title: 'Documentos cargados',
                data: { breadcrumb: 'Documentos cargados', roles: ALL_ROLES }
              },
              {
                path: 'view_sustentation_details/:sustentationId',
                component: SustentationDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Detalles de la sustentación',
                data: { breadcrumb: 'Detalles de la sustentación', roles: ALL_ROLES }
              },
              {
                path: 'corrected_documents',
                component: CorrectedDocumentsPageComponent,
                canActivate: [roleGuard],
                title: 'Documentos corregidos',
                data: { breadcrumb: 'Documentos corregidos', roles: ALL_ROLES }
              }
            ]
          }
        ]
      }
    ]
  }
];
