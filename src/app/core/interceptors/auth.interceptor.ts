import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStorageService } from '../services/auth/auth-storage.service';
import { AuthService } from '../services/auth/auth.service';

/** Código del backend cuando el usuario debe cambiar primero la contraseña que le asignaron */
export const CAMBIO_PASSWORD_PENDIENTE = 'GC-0012';

/**
 * Agrega el token de la sesión a las peticiones al backend y, si el backend
 * responde 401 (token vencido, sesión cerrada o usuario inactivado), cierra la
 * sesión. La petición de login se excluye en ambos casos: su 401 es un login
 * fallido. Un 403 porque falta cambiar la contraseña asignada lleva a
 * cambiarla.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(AuthStorageService);
  const authService = inject(AuthService);

  const esApi = req.url.startsWith(environment.apiUrl);
  const esLogin = req.url === `${environment.apiUrl}/auth/login`;
  const token = storage.token();

  const peticion = esApi && !esLogin && token && !req.headers.has('Authorization')
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(peticion).pipe(
    catchError((error: unknown) => {
      if (esApi && !esLogin && error instanceof HttpErrorResponse && error.status === 401) {
        authService.expireSession();
      }
      if (esApi && error instanceof HttpErrorResponse && error.status === 403
        && (error.error as { errorCode?: unknown } | null)?.errorCode === CAMBIO_PASSWORD_PENDIENTE) {
        authService.requirePasswordChange();
      }
      return throwError(() => error);
    })
  );
};
