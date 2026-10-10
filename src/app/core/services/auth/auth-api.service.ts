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

/**
 * Llamadas al backend de autenticación: login (`POST /auth/login` y luego
 * `GET /usuarios/me`), consulta del usuario autenticado y cambio de contraseña.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http    = inject(HttpClient);
  private readonly storage = inject(AuthStorageService);
  private readonly router  = inject(Router);
  private readonly apiUrl  = environment.apiUrl;

  /**
   * Inicia sesión. Las credenciales rechazadas (401) y los datos inválidos (400)
   * se devuelven como `{ success: false, message }`; los errores de conexión o
   * del servidor se propagan como error.
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
        return throwError(() => error);
      })
    );
  }

  /** Vuelve a consultar el usuario autenticado (roles o estado pudieron cambiar). */
  refreshCurrentUser(): Observable<void> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/usuarios/me`).pipe(
      tap(usuario => this.storage.setUser(mapUsuarioToUser(usuario))),
      map(() => undefined)
    );
  }

  logout(): void {
    this.storage.clearUser();
    this.router.navigate(['/auth/login']);
  }

  /**
   * Cambia la contraseña del usuario autenticado. Si el backend la rechaza
   * (contraseña actual incorrecta, nueva inválida) el error trae su mensaje.
   */
  changePassword(currentPassword: string, newPassword: string): Observable<ChangePasswordResponse> {
    const cuerpo: CambiarPasswordRequest = { passwordActual: currentPassword, passwordNueva: newPassword };
    return this.http.put<void>(`${this.apiUrl}/usuarios/me/password`, cuerpo).pipe(
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
