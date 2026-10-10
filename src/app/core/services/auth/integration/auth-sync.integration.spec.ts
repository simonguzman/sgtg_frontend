import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { AuthStorageService } from '../auth-storage.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { authInterceptor } from '../../../interceptors/auth.interceptor';
import { UserRoleType } from '../../../enums/user-role-type.enum';
import { crearJwtDePrueba } from '../../../../testing/jwt-de-prueba';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const API = '/api/v1/sgtg';

/**
 * Integración del login con el backend simulado por HttpTestingController:
 * fachada, almacenamiento, interceptor y la sesión que leen los demás módulos.
 */
describe('Integración [Auth]: sesión con el backend (Core ➔ Users)', () => {
  let auth: AuthService;
  let storage: AuthStorageService;
  let userService: UserService;
  let httpClient: HttpClient;
  let http: HttpTestingController;
  let router: { navigate: jest.Mock };
  const token = crearJwtDePrueba();

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    router = { navigate: jest.fn().mockResolvedValue(true) };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    auth = TestBed.inject(AuthService);
    storage = TestBed.inject(AuthStorageService);
    userService = TestBed.inject(UserService);
    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  const iniciarSesion = () => {
    auth.login({ email: 'jefe@unicauca.edu.co', password: 'Clave123*' }).subscribe();
    http.expectOne(`${API}/auth/login`).flush({ token });
    http.expectOne(`${API}/usuarios/me`).flush({
      id: 3, codigo: '2001', tipoDocumento: 'CC', numeroDocumento: '1061', email: 'jefe@unicauca.edu.co',
      primerNombre: 'Luis', segundoNombre: null, primerApellido: 'Mora', segundoApellido: null,
      roles: ['DOCENTE', 'JEFE_DEP'], activo: true
    });
  };

  it('la sesión del login es la misma que leen el guard de roles y el módulo de usuarios', () => {
    iniciarSesion();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.hasAnyRole([UserRoleType.JEFE_DEP])).toBe(true);
    expect(userService.currentUser()?.id).toBe('3');
    expect(userService.currentUserFullName()).toContain('Luis');
  });

  it('el interceptor envía el token en las peticiones al backend', () => {
    iniciarSesion();

    httpClient.get(`${API}/trabajos-grado/mis-trabajos`).subscribe();
    const req = http.expectOne(`${API}/trabajos-grado/mis-trabajos`);
    expect(req.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
    req.flush([]);
  });

  it('el interceptor no envía el token a otros servidores', () => {
    iniciarSesion();

    httpClient.get('/assets/formatos/formato-a.pdf').subscribe();
    const req = http.expectOne('/assets/formatos/formato-a.pdf');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush('');
  });

  it('un 401 del backend cierra la sesión y lleva al login', () => {
    iniciarSesion();

    httpClient.get(`${API}/usuarios/me`).subscribe({ error: () => undefined });
    http.expectOne(`${API}/usuarios/me`).flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(storage.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('sgtg_token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  it('un 401 del login es un login fallido, no cierra ninguna sesión ni navega', () => {
    let respuesta: { success: boolean; message?: string } | undefined;
    auth.login({ email: 'jefe@unicauca.edu.co', password: 'otra' }).subscribe(r => respuesta = r);
    http.expectOne(`${API}/auth/login`).flush(
      { errorCode: 'GC-0005', message: 'Correo o contraseña incorrectos.' }, { status: 401, statusText: 'Unauthorized' });

    expect(respuesta).toEqual({ success: false, message: 'Correo o contraseña incorrectos.' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('logout cierra la sesión para todos los módulos', () => {
    iniciarSesion();
    auth.logout();

    expect(userService.currentUser()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });
});
