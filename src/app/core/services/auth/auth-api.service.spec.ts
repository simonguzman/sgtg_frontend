import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthApiService, CREDENCIALES_INVALIDAS, DEMASIADOS_INTENTOS } from './auth-api.service';
import { AuthStorageService } from './auth-storage.service';
import { UsuarioResponse } from '../../interfaces/api/auth-api.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const API = '/api/v1/sgtg';

const usuarioApi = (overrides: Partial<UsuarioResponse> = {}): UsuarioResponse => ({
  id: 7,
  codigo: '1001',
  tipoDocumento: 'CC',
  numeroDocumento: '1061000000',
  email: 'docente@unicauca.edu.co',
  primerNombre: 'Ana',
  segundoNombre: null,
  primerApellido: 'Pérez',
  segundoApellido: 'Gómez',
  roles: ['DOCENTE', 'JEFE_DEP'],
  activo: true,
  tipoVinculacion: null,
  departamento: null,
  programa: null,
  ...overrides
});

describe('AuthApiService', () => {
  let service: AuthApiService;
  let storage: AuthStorageService;
  let http: HttpTestingController;
  let router: { navigate: jest.Mock };
  const token = crearJwtDePrueba();
  const credenciales = { email: 'docente@unicauca.edu.co', password: 'Clave123*' };

  beforeEach(() => {
    localStorage.clear();
    router = { navigate: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(AuthApiService);
    storage = TestBed.inject(AuthStorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('login', () => {
    it('obtiene el token, consulta el usuario con ese token y guarda la sesión', () => {
      let respuesta: { success: boolean; message?: string } | undefined;
      service.login(credenciales).subscribe(r => respuesta = r);

      const login = http.expectOne(`${API}/auth/login`);
      expect(login.request.method).toBe('POST');
      expect(login.request.body).toEqual(credenciales);
      login.flush({ token });

      const me = http.expectOne(`${API}/usuarios/me`);
      expect(me.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      me.flush(usuarioApi());

      expect(respuesta).toEqual({ success: true });
      expect(storage.token()).toBe(token);
      expect(storage.currentUser()).toEqual(expect.objectContaining({
        id: '7',
        email: 'docente@unicauca.edu.co',
        roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP],
        state: UserState.active
      }));
      expect(storage.currentUser()?.password).toBeUndefined();
    });

    it('con credenciales rechazadas (401) devuelve el mensaje del backend y no guarda sesión', () => {
      let respuesta: { success: boolean; message?: string } | undefined;
      service.login(credenciales).subscribe(r => respuesta = r);

      http.expectOne(`${API}/auth/login`).flush(
        { errorCode: 'GC-0005', message: 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.' },
        { status: 401, statusText: 'Unauthorized' });

      expect(respuesta).toEqual({
        success: false,
        message: 'Tu cuenta se encuentra inhabilitada. Contacta al administrador.'
      });
      expect(storage.isAuthenticated()).toBe(false);
    });

    it('con un 400 de validación (sin message) usa el mensaje genérico', () => {
      let respuesta: { success: boolean; message?: string } | undefined;
      service.login({ email: '', password: '' }).subscribe(r => respuesta = r);

      http.expectOne(`${API}/auth/login`).flush({ email: 'El correo electrónico es obligatorio' },
        { status: 400, statusText: 'Bad Request' });

      expect(respuesta).toEqual({ success: false, message: CREDENCIALES_INVALIDAS });
    });

    it('con demasiados intentos (429) avisa que espere', () => {
      let respuesta: { success: boolean; message?: string } | undefined;
      service.login(credenciales).subscribe(r => respuesta = r);

      http.expectOne(`${API}/auth/login`).flush('<html>429 Too Many Requests</html>',
        { status: 429, statusText: 'Too Many Requests' });

      expect(respuesta).toEqual({ success: false, message: DEMASIADOS_INTENTOS });
    });

    it('propaga los errores de conexión o del servidor', () => {
      let error: unknown;
      service.login(credenciales).subscribe({ error: e => error = e });

      http.expectOne(`${API}/auth/login`).error(new ProgressEvent('error'), { status: 0 });

      expect(error).toBeDefined();
      expect(storage.isAuthenticated()).toBe(false);
    });
  });

  it('refreshCurrentUser actualiza el usuario en sesión', () => {
    storage.setSession(token, { id: '7', roles: [UserRoleType.DOCENTE] } as never);
    service.refreshCurrentUser().subscribe();

    http.expectOne(`${API}/usuarios/me`).flush(usuarioApi({ roles: ['DOCENTE', 'DIRECTOR'], activo: false }));

    expect(storage.currentUser()?.roles).toEqual([UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
    expect(storage.currentUser()?.state).toBe(UserState.inactive);
  });

  describe('logout', () => {
    it('cierra la sesión en el backend con el token, limpia la sesión y navega al login', () => {
      storage.setSession(token, { id: '7', roles: [] } as never);
      service.logout();

      const cierre = http.expectOne(`${API}/auth/logout`);
      expect(cierre.request.method).toBe('POST');
      expect(cierre.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      expect(storage.isAuthenticated()).toBe(false);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
      // Si el backend falla, la sesión local ya quedó cerrada
      cierre.flush(null, { status: 500, statusText: 'Server Error' });
    });

    it('envía el motivo del cierre', () => {
      storage.setSession(token, { id: '7', roles: [] } as never);
      service.logout('inactividad');
      http.expectOne(`${API}/auth/logout?motivo=inactividad`).flush(null, { status: 204, statusText: 'No Content' });
    });

    it('con el token de acceso vencido (o tras recargar) cierra la sesión con la cookie', () => {
      localStorage.setItem('sgtg_hay_sesion', '1');
      service.logout();
      const cierre = http.expectOne(`${API}/auth/logout`);
      expect(cierre.request.headers.has('Authorization')).toBe(false);
      cierre.flush(null, { status: 204, statusText: 'No Content' });
      expect(storage.haySesionGuardada()).toBe(false);
    });

    it('sin sesión no llama al backend', () => {
      service.logout();
      http.expectNone(`${API}/auth/logout`);
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('renovar', () => {
    const usuarioApi = {
      id: 7, codigo: '2001', tipoDocumento: 'CC', numeroDocumento: '1061', email: 'a@unicauca.edu.co',
      primerNombre: 'Ana', segundoNombre: null, primerApellido: 'Mora', segundoApellido: null,
      roles: ['DOCENTE'], activo: true
    };

    it('al recargar la página recupera el token y el usuario con la cookie de renovación', () => {
      let resultado: string | undefined;
      service.renovar().subscribe(r => resultado = r);

      const renovacion = http.expectOne(`${API}/auth/renovar`);
      expect(renovacion.request.method).toBe('POST');
      // El backend exige la cabecera: un sitio ajeno no puede enviarla
      expect(renovacion.request.headers.get('X-Requested-With')).toBe('XMLHttpRequest');
      renovacion.flush({ token });
      const usuario = http.expectOne(`${API}/usuarios/me`);
      expect(usuario.request.headers.get('Authorization')).toBe(`Bearer ${token}`);
      usuario.flush(usuarioApi);

      expect(resultado).toBe('renovada');
      expect(storage.isAuthenticated()).toBe(true);
      expect(storage.haySesionGuardada()).toBe(true);
    });

    it('con la sesión en curso solo reemplaza el token', () => {
      storage.setSession(crearJwtDePrueba(30), { id: '7', roles: [] } as never);
      service.renovar().subscribe();
      http.expectOne(`${API}/auth/renovar`).flush({ token });
      http.expectNone(`${API}/usuarios/me`);
      expect(storage.token()).toBe(token);
    });

    it('un 401 es una sesión vencida y un error de conexión se propaga', () => {
      let resultado: string | undefined;
      service.renovar().subscribe(r => resultado = r);
      http.expectOne(`${API}/auth/renovar`).flush(null, { status: 401, statusText: 'Unauthorized' });
      expect(resultado).toBe('vencida');

      let error: unknown;
      service.renovar().subscribe({ error: e => error = e });
      http.expectOne(`${API}/auth/renovar`).error(new ProgressEvent('error'), { status: 0 });
      expect(error).toBeDefined();
    });
  });

  describe('changePassword', () => {
    it('envía la contraseña actual y la nueva, y sigue la sesión con el token nuevo', () => {
      storage.setSession(crearJwtDePrueba(3600, { cambioPassword: true }), { id: '7', roles: [] } as never);
      expect(storage.debeCambiarPassword()).toBe(true);
      let respuesta: { success: boolean; message: string } | undefined;
      service.changePassword('Actual123', 'Nueva1234').subscribe(r => respuesta = r);

      const req = http.expectOne(`${API}/usuarios/me/password`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ passwordActual: 'Actual123', passwordNueva: 'Nueva1234' });
      // El backend cierra las demás sesiones y devuelve un token nuevo para esta
      req.flush({ token });

      expect(respuesta?.success).toBe(true);
      expect(storage.token()).toBe(token);
      expect(storage.debeCambiarPassword()).toBe(false);
    });

    it('si el backend la rechaza, el error trae su mensaje', () => {
      let error: Error | undefined;
      service.changePassword('Otra1234', 'Nueva1234').subscribe({ error: e => error = e });

      http.expectOne(`${API}/usuarios/me/password`).flush(
        { errorCode: 'GC-0004', message: 'La contraseña actual es incorrecta.' },
        { status: 400, statusText: 'Bad Request' });

      expect(error?.message).toBe('La contraseña actual es incorrecta.');
    });

    it('sin mensaje del backend usa uno genérico', () => {
      let error: Error | undefined;
      service.changePassword('Actual123', 'Nueva1234').subscribe({ error: e => error = e });

      http.expectOne(`${API}/usuarios/me/password`).error(new ProgressEvent('error'), { status: 0 });

      expect(error?.message).toBe('No se pudo cambiar la contraseña. Intenta de nuevo.');
    });
  });
});
