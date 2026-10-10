import { TestBed } from '@angular/core/testing';
import { HttpTestingController } from '@angular/common/http/testing';
import { AuthStorageService } from '../core/services/auth/auth-storage.service';
import { TrabajoGradoStoreService } from '../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoResponse } from '../core/interfaces/api/trabajo-grado-api.interface';
import { User } from '../modules/users/interfaces/user.interface';
import { crearJwtDePrueba } from './jwt-de-prueba';

/**
 * Inicia sesión con `usuario` y responde la carga inicial de trabajos de grado
 * (`/trabajos-grado` o `/mis-trabajos`, según el rol) con `trabajos`. Requiere
 * `provideHttpClient()` y `provideHttpClientTesting()` en el TestBed. Otras
 * peticiones de la sesión (p. ej. la lista de usuarios) quedan pendientes.
 */
export function iniciarSesionConTrabajos(usuario: User, trabajos: TrabajoGradoResponse[]): void {
  TestBed.inject(TrabajoGradoStoreService);
  const http = TestBed.inject(HttpTestingController);
  TestBed.inject(AuthStorageService).setSession(crearJwtDePrueba(), usuario);
  TestBed.tick();
  http.match(req => req.method === 'GET' && /\/trabajos-grado(\/mis-trabajos)?$/.test(req.url))
    .forEach(req => req.flush(trabajos));
}
