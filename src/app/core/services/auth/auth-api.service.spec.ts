import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthApiService, CREDENCIALES_INVALIDAS } from './auth-api.service';
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

  it('logout limpia la sesión y navega al login', () => {
    storage.setSession(token, { id: '7', roles: [] } as never);
    service.logout();
    expect(storage.isAuthenticated()).toBe(false);
    expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
  });

  describe('changePassword', () => {
    it('envía la contraseña actual y la nueva', () => {
      let respuesta: { success: boolean; message: string } | undefined;
      service.changePassword('Actual123', 'Nueva1234').subscribe(r => respuesta = r);

      const req = http.expectOne(`${API}/usuarios/me/password`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ passwordActual: 'Actual123', passwordNueva: 'Nueva1234' });
      req.flush(null, { status: 204, statusText: 'No Content' });

      expect(respuesta?.success).toBe(true);
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
