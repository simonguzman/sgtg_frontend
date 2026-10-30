import { Routes } from '@angular/router';
import { UsersPageComponent } from './pages/users-page/users-page.component';
import { UserCreatePageComponent } from './pages/user-create-page/user-create-page.component';
import { UserEditPageComponent } from './pages/user-edit-page/user-edit-page.component';
import { UserDetailsPageComponent } from './pages/user-details-page/user-details-page.component';
import { roleGuard } from '../../core/guards/role.guard';
import { UserRoleType } from '../../core/enums/user-role-type.enum';
import { ROLES_GESTORES_DE_USUARIOS } from './helpers/user-management.helper';

export const usersRoutes: Routes = [
  {
    path:'profile',
    component: UserDetailsPageComponent,
    canActivate: [roleGuard],
    title: 'Mi perfil',
    data: {
      breadcrumb: 'Perfil',
      roles:[
        UserRoleType.ADMINISTRADOR,
        UserRoleType.ASESOR,
        UserRoleType.CODIRECTOR,
        UserRoleType.COMITE,
        UserRoleType.CONSEJO,
        UserRoleType.DECANATURA,
        UserRoleType.DIRECTOR,
        UserRoleType.DOCENTE,
        UserRoleType.ESTUDIANTE,
        UserRoleType.EVALUADOR,
        UserRoleType.JEFE_DEP,
        UserRoleType.JURADO
      ]
    }
  },
  {
    path: '',
    data: { breadcrumb: 'Usuarios' },
    children: [
      {
        path:'',
        component: UsersPageComponent,
        canActivate: [roleGuard],
        title: 'Gestión de usuarios',
        data: {
          breadcrumb: null,
          roles: [...ROLES_GESTORES_DE_USUARIOS]
        }
      },
      {
        path:'create',
        component: UserCreatePageComponent,
        canActivate: [roleGuard],
        title: 'Crear nuevo usuario',
        data: {
          breadcrumb: 'Crear usuario',
          roles: [...ROLES_GESTORES_DE_USUARIOS]
        }
      },
      {
        path:'edit/:id',
        component: UserEditPageComponent,
        canActivate: [roleGuard],
        title: 'Editar usuario',
        data: {
          breadcrumb: 'Editar usuario',
          roles: [...ROLES_GESTORES_DE_USUARIOS]
        }
      },
      {
        path:'details/:id',
        component: UserDetailsPageComponent,
        canActivate: [roleGuard],
        title: 'Información del usuario',
        data: {
          breadcrumb: 'Información del usuario',
          roles: [...ROLES_GESTORES_DE_USUARIOS]
        }
      }
    ]
  },
]
