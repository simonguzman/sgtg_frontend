import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RequiredPasswordChangeComponent } from './components/required-password-change/required-password-change.component';

export const authRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    // Solo con una sesión que debe cambiar la contraseña asignada (lo controla publicGuard)
    path: 'cambiar-password',
    component: RequiredPasswordChangeComponent
  },
  {
    path:'',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
