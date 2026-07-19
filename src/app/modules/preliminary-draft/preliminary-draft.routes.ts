import { Routes } from '@angular/router';
import { PreliminaryDraftPageComponent } from './pages/preliminary-draft-page/preliminary-draft-page.component';
import { DownloadableFormatsPageComponent } from '../../shared/pages/downloadable-formats-page/downloadable-formats-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/enums/user-role-type.enum';
import { PreliminaryDraftCreatePageComponent } from './pages/preliminary-draft-create-page/preliminary-draft-create-page.component';
import { PreliminaryDraftDetailsPageComponent } from './pages/preliminary-draft-details-page/preliminary-draft-details-page.component';
import { PreliminaryDraftEditPageComponent } from './pages/preliminary-draft-edit-page/preliminary-draft-edit-page.component';
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';
import { LoadedDocumentsPreliminaryDraftPageComponent } from './pages/loaded-documets-preliminary-draft-page/loaded-documents-preliminary-draft-page.component';
import { ReviewPreliminaryDraftPageComponent } from './pages/review-preliminary-draft-page/review-preliminary-draft-page.component';
import { ReviewPresentationsFacultyCouncilPageComponent } from './pages/review-presentations-faculty-council-page/review-presentations-faculty-council-page.component';
import { AssignEvaluatorsPageComponent } from './pages/assign-evaluators-page/assign-evaluators-page.component';

export const preliminaryDraftRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Anteproyectos'},
    children: [
      {
        path: '',
        component: PreliminaryDraftPageComponent,
        canActivate: [roleGuard],
        title: 'Anteproyectos de trabajo de grado',
        data: {
          breadcrumb: null,
          roles: [
            UserRoleType.ADMINISTRADOR,
            UserRoleType.DIRECTOR,
            UserRoleType.CODIRECTOR,
            UserRoleType.ASESOR,
            UserRoleType.ESTUDIANTE,
            UserRoleType.JEFE_DEP,
            UserRoleType.EVALUADOR,
            UserRoleType.CONSEJO
          ]
        }
      },
      {
        path: 'downloadable_formats',
        component: DownloadableFormatsPageComponent,
        title: 'Formatos descargables',
        data: { breadcrumb: 'Formatos descargables' }
      },
      {
        path: 'create',
        component: PreliminaryDraftCreatePageComponent,
        canActivate: [roleGuard],
        title: 'Registrar anteproyecto',
        data: {
          breadcrumb: 'Registrar anteproyecto',
          roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
        }
      },
      {
        path: 'edit/:id',
        component: PreliminaryDraftEditPageComponent,
        canActivate: [roleGuard],
        title: 'Editar anteproyecto de trabajo de grado',
        data: {
          breadcrumb: 'Actualizar propuesta',
          roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
        }
      },
      {
        path: 'details/:id',
        data: { breadcrumb: 'Información del anteproyecto' },
        children:[
          {
            path: '',
            component: PreliminaryDraftDetailsPageComponent,
            canActivate: [roleGuard],
            title: 'Información del anteproyecto',
            data: {
              breadcrumb: null,
              roles: [
                UserRoleType.ADMINISTRADOR,
                UserRoleType.DIRECTOR,
                UserRoleType.CODIRECTOR,
                UserRoleType.ASESOR,
                UserRoleType.ESTUDIANTE,
                UserRoleType.JEFE_DEP,
                UserRoleType.EVALUADOR,
                UserRoleType.CONSEJO
              ]
            }
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
                UserRoleType.JEFE_DEP,
                UserRoleType.EVALUADOR,
                UserRoleType.CONSEJO
              ]
            }
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
                data: {
                  breadcrumb: null,
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.DIRECTOR,
                    UserRoleType.CODIRECTOR,
                    UserRoleType.ASESOR,
                    UserRoleType.ESTUDIANTE,
                    UserRoleType.JEFE_DEP,
                    UserRoleType.EVALUADOR,
                    UserRoleType.CONSEJO
                  ]
                }
              },
              {
                path: 'assign_evaluators',
                component: AssignEvaluatorsPageComponent,
                canActivate: [roleGuard],
                title: 'Asignar evaluadores',
                data: {
                  breadcrumb: 'Asignar evaluadores',
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.JEFE_DEP,
                  ]
                }
              },
              {
                path: 'review_preliminary_draft',
                component: ReviewPreliminaryDraftPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluar anteproyecto',
                data: {
                  breadcrumb: 'Evaluar anteproyecto',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.EVALUADOR]
                }
              },
               {
                path: 'evaluate_presentation',
                component: ReviewPresentationsFacultyCouncilPageComponent,
                canActivate: [roleGuard],
                title: 'Evaluar presentación',
                data: {
                  breadcrumb: 'Evaluar presentación',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
                }
              }
            ]
          },
        ]
      },
    ]
  }
]
