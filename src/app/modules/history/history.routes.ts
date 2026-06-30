import { Routes } from '@angular/router';
import { HistoryPageComponent } from './pages/history-page/history-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/models/user-role';

// --- Imports de Propuestas ---
import { ProposalDetailsPageComponent } from '../proposal/pages/proposal-details-page/proposal-details-page.component';
import { LoadedProposalsPageComponent } from '../proposal/pages/loaded-proposals-page/loaded-proposals-page.component';
import { EvaluationProposalPageComponent } from '../proposal/pages/evaluation-proposal-page/evaluation-proposal-page.component';

// --- Imports de Compartidos ---
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';

// --- Imports de Anteproyectos ---
import { PreliminaryDraftDetailsPageComponent } from '../preliminary-draft/pages/preliminary-draft-details-page/preliminary-draft-details-page.component';
import { LoadedDocumentsPreliminaryDraftPageComponent } from '../preliminary-draft/pages/loaded-documets-preliminary-draft-page/loaded-documents-preliminary-draft-page.component';
// Nota: Se omiten rutas de asignación y revisión activa porque es historial

// --- Imports de Trabajos de Grado (NUEVOS) ---
import { ThesisWorkDetailsPageComponent } from '../thesis-work/pages/thesis-work-details-page/thesis-work-details-page.component';
import { LoadedDocumentsThesisWorkPageComponent } from '../thesis-work/pages/loaded-documents-thesis-work-page/loaded-documents-thesis-work-page.component';
import { SustentationDetailsPageComponent } from '../thesis-work/pages/sustentation-details-page/sustentation-details-page.component';
import { CorrectedDocumentsPageComponent } from '../thesis-work/pages/corrected-documents-page/corrected-documents-page.component';

const ALL_ROLES = [
  UserRoleType.ADMINISTRADOR,
  UserRoleType.DIRECTOR,
  UserRoleType.CODIRECTOR,
  UserRoleType.ASESOR,
  UserRoleType.ESTUDIANTE,
  UserRoleType.COMITE,
  UserRoleType.JEFE_DEP,
  UserRoleType.EVALUADOR,
  UserRoleType.CONSEJO,
  UserRoleType.JURADO // Asegurado de que Jurado esté aquí por si acceden al historial de sus evaluaciones
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
        title: 'Historial de procesos',
        data: { breadcrumb: null }
      },

      // ==========================================
      // 1. RAMA DE PROPUESTAS ARCHIVADAS
      // ==========================================
      {
        path: 'proposal-details/:id',
        data: { breadcrumb: 'Propuestas Archivadas' },
        children: [
          {
            path: '',
            data: { breadcrumb: 'Detalle de la propuesta archivada' },
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
      },

      // ==========================================
      // 2. RAMA DE ANTEPROYECTOS ARCHIVADOS
      // ==========================================
      {
        path: 'preliminary-draft-details/:id',
        data: { breadcrumb: 'Anteproyectos Archivados' },
        children: [
          {
            // Wrapper intermedio para el breadcrumb individual
            path: '',
            data: { breadcrumb: 'Detalle del anteproyecto archivado' },
            children: [
              {
                path: '',
                component: PreliminaryDraftDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Información del anteproyecto',
                data: { breadcrumb: null, roles: ALL_ROLES }
              },
              {
                // Reutiliza el mismo componente compartido
                path: 'evaluations_performed',
                component: EvaluationsPerformedPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluaciones realizadas',
                data: { breadcrumb: 'Evaluaciones realizadas', roles: ALL_ROLES }
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
                    data: { breadcrumb: null, roles: ALL_ROLES }
                  },
                ]
              }
            ]
          }
        ]
      },

      // ==========================================
      // 3. RAMA DE TRABAJOS DE GRADO ARCHIVADOS (NUEVA)
      // ==========================================
      {
        path: 'thesis-work-details/:id',
        data: { breadcrumb: 'Trabajos de Grado Archivados' },
        children: [
          {
            // Wrapper intermedio para el breadcrumb individual
            path: '',
            data: { breadcrumb: 'Detalle del trabajo de grado archivado' },
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
                data: { breadcrumb: 'Documentos cargados' },
                children: [
                  {
                    path: '',
                    component: LoadedDocumentsThesisWorkPageComponent,
                    canActivate: [roleGuard],
                    title: 'Documentos cargados',
                    data: { breadcrumb: null, roles: ALL_ROLES }
                  }
                ]
              },
              {
                // Mantiene el parámetro ':id' idéntico al módulo principal para evitar romper el componente
                path: 'view_sustentation_details/:id',
                component: SustentationDetailsPageComponent,
                canActivate: [roleGuard],
                title: 'Detalles de la sustentación',
                data: { breadcrumb: 'Detalles de la sustentación', roles: ALL_ROLES }
              },
              {
                // Implementación aplanada siguiendo la solución que tenías en thesisWorkRoutes
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
