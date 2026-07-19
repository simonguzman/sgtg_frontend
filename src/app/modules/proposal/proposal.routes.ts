import { Routes } from '@angular/router';
import { ProposalPageComponent } from './pages/proposal-page/proposal-page.component';
import { ProposalCreatePageComponent } from './pages/proposal-create-page/proposal-create-page.component';
import { ProposalEditPageComponent } from './pages/proposal-edit-page/proposal-edit-page.component';
import { ProposalDetailsPageComponent } from './pages/proposal-details-page/proposal-details-page.component';
import { DownloadableFormatsPageComponent } from '../../shared/pages/downloadable-formats-page/downloadable-formats-page.component';
import { LoadedProposalsPageComponent } from './pages/loaded-proposals-page/loaded-proposals-page.component';
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';
import { EvaluationProposalPageComponent } from './pages/evaluation-proposal-page/evaluation-proposal-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/enums/user-role-type.enum';

export const proposalRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Propuestas'},
    children: [
      {
        path: '',
        component: ProposalPageComponent,
        title: 'Propuestas de trabajo de grado',
        data: { breadcrumb: null }
      },
      {
        path: 'downloadable_formats',
        component: DownloadableFormatsPageComponent,
        title: 'Formatos descargables',
        data: { breadcrumb: 'Formatos descargables' }
      },
      {
        path: 'create',
        component: ProposalCreatePageComponent,
        canActivate: [roleGuard],
        title: 'Registrar propuesta de trabajo de grado',
        data: {
          breadcrumb: 'Crear propuesta',
          roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
        }
      },
      {
        path: 'edit/:id',
        component: ProposalEditPageComponent,
        canActivate: [roleGuard],
        title: 'Editar propuesta de trabajo de grado',
        data: {
          breadcrumb: 'Actualizar propuesta',
          roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
        }
      },
      {
        path: 'details/:id',
        data: { breadcrumb: 'Información de la propuesta' },
        children:[
          {
            path: '',
            component: ProposalDetailsPageComponent,
            canActivate: [roleGuard],
            title: 'Información de la propuesta',
            data: {
              breadcrumb: null,
              roles: [
                UserRoleType.ADMINISTRADOR,
                UserRoleType.DIRECTOR,
                UserRoleType.CODIRECTOR,
                UserRoleType.ASESOR,
                UserRoleType.ESTUDIANTE,
                UserRoleType.COMITE
              ]
            },
          },
          {
            path: 'evaluations_performed',
            component: EvaluationsPerformedPageComponent,
            canActivate: [roleGuard],
            title: 'Evaluaciones realizadas',
            data: {
              breadcrumb: 'Evaluaciones realizadas',
              roles: [
                UserRoleType.ADMINISTRADOR,
                UserRoleType.DIRECTOR,
                UserRoleType.CODIRECTOR,
                UserRoleType.ASESOR,
                UserRoleType.ESTUDIANTE,
                UserRoleType.COMITE
              ]
            }
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
                data: {
                  breadcrumb: null,
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.DIRECTOR,
                    UserRoleType.CODIRECTOR,
                    UserRoleType.ASESOR,
                    UserRoleType.ESTUDIANTE,
                    UserRoleType.COMITE
                  ]
                }
              },
              {
                path: 'evaluate_proposal',
                component: EvaluationProposalPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluar propuesta',
                data: {
                  breadcrumb: 'Evaluar propuesta',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.COMITE]
                }
              }
            ]
          },
        ]
      }
    ]
  }
]
