import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, of, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthStorageService } from '../services/auth/auth-storage.service';
import { AuthService } from '../services/auth/auth.service';

/** Código del backend cuando el usuario debe cambiar primero la contraseña que le asignaron */
export const CAMBIO_PASSWORD_PENDIENTE = 'GC-0012';

/**
 * Agrega el token de la sesión a las peticiones al backend. Si el backend
 * responde 401 (el token de acceso venció, la sesión se cerró o el usuario se
 * inactivó), intenta renovar la sesión una vez y repite la petición; si no se
 * puede renovar, cierra la sesión. Las peticiones de `/auth/...` (login,
 * renovación, cierre) y las que ya traen su propio token se excluyen: sus 401
 * los atiende quien las hizo. Un 403 porque falta cambiar la contraseña
 * asignada lleva a cambiarla.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const storage = inject(AuthStorageService);
  const authService = inject(AuthService);

  const esApi = req.url.startsWith(environment.apiUrl);
  const esAutenticacion = req.url.startsWith(`${environment.apiUrl}/auth/`);
  const tokenPropio = req.headers.has('Authorization');
  const conToken = (peticion: HttpRequest<unknown>, token: string | null) =>
    esApi && !esAutenticacion && token && !tokenPropio
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return next(conToken(req, storage.token())).pipe(
    catchError((error: unknown) => {
      if (esApi && !esAutenticacion && !tokenPropio && error instanceof HttpErrorResponse && error.status === 401) {
        return authService.renovarSesion().pipe(
          // Sin conexión con el backend la sesión no se cierra: se informa el error original
          catchError(() => of('sin-conexion' as const)),
          switchMap(resultado => {
            if (resultado === 'renovada') return next(conToken(req, storage.token()));
            if (resultado === 'vencida') authService.expireSession();
            return throwError(() => error);
          })
        );
      }
      if (esApi && error instanceof HttpErrorResponse && error.status === 403
        && (error.error as { errorCode?: unknown } | null)?.errorCode === CAMBIO_PASSWORD_PENDIENTE) {
        authService.requirePasswordChange();
      }
      return throwError(() => error);
    })
  );
};
