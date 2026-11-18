import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RequiredPasswordChangeComponent } from './components/required-password-change/required-password-change.component';

/**
 * Rutas de autenticación: inicio de sesión y cambio obligatorio de la contraseña asignada, que solo abre una
 * sesión que debe cambiarla (lo controla `publicGuard`).
 */
export const authRoutes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'cambiar-password',
    component: RequiredPasswordChangeComponent
  },
  {
    path:'',
    redirectTo: 'login',
    pathMatch: 'full'
  }
];
