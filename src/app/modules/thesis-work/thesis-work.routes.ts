import { Routes } from '@angular/router';
import { ThesisWorkPageComponent } from './pages/thesis-work-page/thesis-work-page.component';
import { ThesisWorkDetailsPageComponent } from './pages/thesis-work-details-page/thesis-work-details-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { thesisRestrictedStatusGuard } from '../../core/guards/thesis-status.guard';
import { UserRoleType } from '../../core/models/user-role';
import { EvaluationsPerformedPageComponent } from '../../shared/pages/evaluations-performed-page/evaluations-performed-page.component';
import { LoadedDocumentsThesisWorkPageComponent } from './pages/loaded-documents-thesis-work-page/loaded-documents-thesis-work-page.component';
import { UploadAdvancePageComponent } from './pages/upload-advance-page/upload-advance-page.component';
import { EvaluateAdvancePageComponent } from './pages/evaluate-advance-page/evaluate-advance-page.component';
import { UploadFinalDeliveryPageComponent } from './pages/upload-final-delivery-page/upload-final-delivery-page.component';
import { RegisterPazYSalvoPageComponent } from './pages/register-paz-y-salvo-page/register-paz-y-salvo-page.component';
import { RegisterSustentationPageComponent } from './pages/register-sustentation-page/register-sustentation-page.component';
import { EvaluateSustentationPageComponent } from './pages/evaluate-sustentation-page/evaluate-sustentation-page.component';
import { SustentationDetailsPageComponent } from './pages/sustentation-details-page/sustentation-details-page.component';
import { CorrectedDocumentsPageComponent } from './pages/corrected-documents-page/corrected-documents-page.component';
import { RegisterCorrectedDocumentsPageComponent } from './pages/register-corrected-documents-page/register-corrected-documents-page.component';
import { EvaluateCorrectionsPageComponent } from './pages/evaluate-corrections-page/evaluate-corrections-page.component';
import { RegisterCorrespondencePageComponent } from './pages/register-correspondence-page/register-correspondence-page.component';
import { RegisterSpecialRequestPageComponent } from './pages/register-special-request-page/register-special-request-page.component';
import { EvaluateSpecialRequestPageComponent } from './pages/evaluate-special-request-page/evaluate-special-request-page.component';
import { DownloadableFormatsPageComponent } from '../../shared/pages/downloadable-formats-page/downloadable-formats-page.component';

export const thesisWorkRoutes: Routes = [
  {
    path: '',
    data: { breadcrumb: 'Trabajos de grado' },
    children: [
      {
        path: '',
        component: ThesisWorkPageComponent,
        title: 'Trabajos de grado',
        data: { breadcrumb: null },
      },
      {
        path: 'downloadable_formats',
        component: DownloadableFormatsPageComponent,
        title: 'Formatos descargables',
        data: { breadcrumb: 'Formatos descargables' }
      },
      {
        path: 'details/:id',
        data: { breadcrumb: 'Información del trabajo de grado' },
        children: [
          {
            path: '',
            component: ThesisWorkDetailsPageComponent,
            canActivate: [roleGuard],
            title: 'Información del trabajo de grado',
            data: {
              breadcrumb: null,
              roles: [
                UserRoleType.ADMINISTRADOR,
                UserRoleType.DIRECTOR,
                UserRoleType.CODIRECTOR,
                UserRoleType.ASESOR,
                UserRoleType.ESTUDIANTE,
                UserRoleType.DECANATURA,
                UserRoleType.CONSEJO,
                UserRoleType.JURADO
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
                UserRoleType.DECANATURA,
                UserRoleType.CONSEJO,
                UserRoleType.JURADO
              ]
            }
          },
          {
            path: 'loaded_documents',
            data: { breadcrumb: 'Documentos cargados' },
            children: [
              {
                path: '',
                component: LoadedDocumentsThesisWorkPageComponent,
                canActivate: [roleGuard], // 👈 La vista general sigue igual, es de solo lectura
                title: 'Documentos cargados',
                data: {
                  breadcrumb: null,
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.DIRECTOR,
                    UserRoleType.CODIRECTOR,
                    UserRoleType.ASESOR,
                    UserRoleType.ESTUDIANTE,
                    UserRoleType.DECANATURA,
                    UserRoleType.CONSEJO,
                    UserRoleType.JURADO
                  ]
                }
              },
              {
                path: 'upload_advance',
                component: UploadAdvancePageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Cargar avances',
                data: {
                  breadcrumb: 'Cargar avances',
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.ESTUDIANTE,
                  ]
                }
              },
              {
                path: 'evaluate_advance/:advanceId',
                component: EvaluateAdvancePageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Evaluar avances',
                data: {
                  breadcrumb: 'Evaluar avances',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.ASESOR]
                }
              },
              {
                path: 'register_final_delivery',
                component: UploadFinalDeliveryPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Registrar entrega final',
                data: {
                  breadcrumb: 'Registrar entrega final',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
                }
              },
              {
                path: 'register_paz_y_salvo',
                component: RegisterPazYSalvoPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Registrar paz y salvo',
                data: {
                  breadcrumb: 'Registrar paz y salvo',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DECANATURA]
                }
              },
              {
                path: 'register_sustentation',
                component: RegisterSustentationPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Registrar sustentacion',
                data: {
                  breadcrumb: 'Registrar sustentacion',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
                }
              },
              {
                path: 'evaluate_sustentation/:sustentationId',
                component: EvaluateSustentationPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Evaluar sustentación',
                data: {
                  breadcrumb: 'Evaluar sustentación',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.JURADO]
                }
              },
              {
                path: 'register_correspondence',
                component: RegisterCorrespondencePageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Registrar Correspondencia Final',
                data: {
                  breadcrumb: 'Registrar correspondencia',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.JURADO]
                }
              },
              {
                path: 'register_special_request',
                component: RegisterSpecialRequestPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Registrar solicitud especial',
                data: {
                  breadcrumb: 'Registrar solicitud especial',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.DIRECTOR]
                }
              },
              {
                path: 'evaluate_special_request/:requestId',
                component: EvaluateSpecialRequestPageComponent,
                canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                title: 'Evaluar solicitud especial',
                data: {
                  breadcrumb: 'Evaluar solicitud especial',
                  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO]
                }
              },
              {
                path: 'view_sustentation_details/:id',
                component: SustentationDetailsPageComponent,
                canActivate: [roleGuard], // 👈 Solo lectura, no requiere el guard de bloqueo
                title: 'Detalles de la sustentación',
                data: {
                  breadcrumb: 'Detalles de la sustentación',
                  roles: [
                    UserRoleType.ADMINISTRADOR,
                    UserRoleType.DIRECTOR,
                    UserRoleType.CODIRECTOR,
                    UserRoleType.ASESOR,
                    UserRoleType.ESTUDIANTE,
                    UserRoleType.DECANATURA,
                    UserRoleType.CONSEJO,
                    UserRoleType.JURADO
                  ]
                }
              },
              {
                path: 'corrected_documents',
                data: { breadcrumb: 'Documentos corregidos' },
                children: [
                  {
                    path: '',
                    component: CorrectedDocumentsPageComponent,
                    canActivate: [roleGuard], // 👈 Vista general de lista, no requiere bloqueo
                    title: 'Documentos corregidos',
                    data: {
                      breadcrumb: null,
                      roles: [
                        UserRoleType.ADMINISTRADOR,
                        UserRoleType.DIRECTOR,
                        UserRoleType.CODIRECTOR,
                        UserRoleType.ASESOR,
                        UserRoleType.ESTUDIANTE,
                        UserRoleType.DECANATURA,
                        UserRoleType.CONSEJO,
                        UserRoleType.JURADO
                      ]
                    }
                  },
                  {
                    path: 'upload_corrections',
                    component: RegisterCorrectedDocumentsPageComponent,
                    canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                    title: 'Cargar documentos corregidos',
                    data: {
                      breadcrumb: 'Cargar correcciones',
                      roles: [
                        UserRoleType.ADMINISTRADOR,
                        UserRoleType.DIRECTOR,
                      ]
                    }
                  },
                  {
                    path: 'evaluate_corrections',
                    component: EvaluateCorrectionsPageComponent,
                    canActivate: [roleGuard, thesisRestrictedStatusGuard], // 🔒 Protegido
                    title: 'Evaluar documentos corregidos',
                    data: {
                      breadcrumb: 'Evaluar correcciones',
                      roles: [
                        UserRoleType.ADMINISTRADOR,
                        UserRoleType.JURADO
                      ]
                    }
                  },
                ]
              }
            ]
          },
        ]
      }
    ]
  }
];
