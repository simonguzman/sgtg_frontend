import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, Observable, of, switchMap, tap, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { AuthStorageService } from './auth-storage.service';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';
import { ApiError, CambiarPasswordRequest, LoginResponse, UsuarioResponse } from '../../interfaces/api/auth-api.interface';
import { mapUsuarioToUser } from '../../mappers/usuario.mapper';

/** Mensaje cuando el backend rechaza las credenciales sin dar uno propio. */
export const CREDENCIALES_INVALIDAS = 'Correo o contraseña incorrectos.';
/** Mensaje cuando se superó el límite de intentos de inicio de sesión desde el mismo equipo. */
export const DEMASIADOS_INTENTOS = 'Demasiados intentos de inicio de sesión. Espera un minuto e intenta de nuevo.';

/** Resultado de renovar la sesión: con un token nuevo, o vencida (hay que volver a iniciar sesión). */
export type ResultadoRenovacion = 'renovada' | 'vencida';

/**
 * Llamadas al backend de autenticación: login (`POST /auth/login` y luego
 * `GET /usuarios/me`), renovación de la sesión, consulta del usuario
 * autenticado y cambio de contraseña.
 *
 * El token de renovación lo maneja el navegador: el backend lo deja en una
 * cookie HttpOnly que solo viaja a `/auth/...` (mismo origen, así que no hace
 * falta `withCredentials`).
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http    = inject(HttpClient);
  private readonly storage = inject(AuthStorageService);
  private readonly router  = inject(Router);
  private readonly apiUrl  = environment.apiUrl;

  /**
   * Inicia sesión. Las credenciales rechazadas (401), los datos inválidos (400)
   * y el exceso de intentos (429) se devuelven como `{ success: false, message }`;
   * los errores de conexión o del servidor se propagan como error.
   */
  login(credentials: { email: string; password: string }): Observable<{ success: boolean; message?: string }> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials).pipe(
      // El token todavía no está en la sesión: se envía explícito para consultar el usuario
      switchMap(({ token }) => this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/me`, {
        headers: { Authorization: `Bearer ${token}` }
      }).pipe(tap(usuario => this.storage.setSession(token, mapUsuarioToUser(usuario))))),
      map(() => ({ success: true })),
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401 || error.status === 400) {
          return of({ success: false, message: this.mensajeDeError(error, CREDENCIALES_INVALIDAS) });
        }
        // Límite de intentos por dirección IP (Nginx)
        if (error.status === 429) {
          return of({ success: false, message: DEMASIADOS_INTENTOS });
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Pide un token de acceso nuevo con el token de renovación de la cookie. Si
   * todavía no hay usuario en la sesión (la página se recargó), también lo
   * consulta. Un 401 o 403 es una sesión vencida; los errores de conexión se
   * propagan, para no cerrar la sesión por una caída momentánea.
   */
  renovar(): Observable<ResultadoRenovacion> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/renovar`, null, {
      // El backend la exige: un sitio ajeno no puede enviarla
      headers: { 'X-Requested-With': 'XMLHttpRequest' }
    }).pipe(
      switchMap(({ token }) => this.storage.currentUser()
        ? of(this.storage.setToken(token))
        : this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/me`, {
            headers: { Authorization: `Bearer ${token}` }
          }).pipe(map(usuario => this.storage.setSession(token, mapUsuarioToUser(usuario))))),
      map((): ResultadoRenovacion => 'renovada'),
      catchError((error: HttpErrorResponse) => error.status === 401 || error.status === 403
        ? of<ResultadoRenovacion>('vencida')
        : throwError(() => error))
    );
  }

  /** Vuelve a consultar el usuario autenticado (roles o estado pudieron cambiar). */
  refreshCurrentUser(): Observable<void> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/me`).pipe(
      tap(usuario => this.storage.setUser(mapUsuarioToUser(usuario))),
      map(() => undefined)
    );
  }

  /**
   * Cierra la sesión: avisa al backend para que la sesión deje de servir (y
   * quede en la auditoría) y borre la cookie de renovación, y limpia la sesión
   * sin esperar la respuesta. Si el token de acceso ya venció, el backend la
   * cierra con la cookie.
   *
   * @param motivo motivo del cierre (ej. `inactividad`), queda en la auditoría
   */
  logout(motivo?: string): void {
    const token = this.storage.token();
    if (token || this.storage.haySesionGuardada()) {
      // El token se envía explícito: la sesión local se limpia antes de que salga la petición
      this.http.post<void>(`${this.apiUrl}/auth/logout`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        params: motivo ? { motivo } : {}
      }).subscribe({ error: () => undefined });
    }
    this.storage.clearUser();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Cambia la contraseña del usuario autenticado. El backend cierra las demás
   * sesiones del usuario y devuelve un token nuevo para seguir en esta. Si la
   * rechaza (contraseña actual incorrecta, nueva inválida o reciente) el error
   * trae su mensaje.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    const cuerpo: CambiarPasswordRequest = { passwordActual: currentPassword, passwordNueva: newPassword };
    return this.http.put<LoginResponse>(`${this.apiUrl}/usuarios/me/password`, cuerpo).pipe(
      tap(({ token }) => this.storage.setToken(token)),
      map(() => ({ success: true, message: 'Contraseña actualizada exitosamente.' })),
      catchError((error: HttpErrorResponse) => throwError(() =>
        new Error(this.mensajeDeError(error, 'No se pudo cambiar la contraseña. Intenta de nuevo.'))))
    );
  }

  /** Mensaje del backend (`Error.message`) o el indicado si la respuesta no lo trae. */
  private mensajeDeError(error: HttpErrorResponse, porDefecto: string): string {
    const cuerpo = error.error as Partial<ApiError> | null;
    return typeof cuerpo?.message === 'string' && cuerpo.message ? cuerpo.message : porDefecto;
  }
}
