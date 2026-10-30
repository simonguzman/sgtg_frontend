import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService } from './auth-api.service';
import { SessionInactivityService } from './session-inactivity.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

interface MockAuthStorageService {
  currentUser: WritableSignal<User | null>;
  isAuthenticated: WritableSignal<boolean>;
  userRoles: WritableSignal<UserRoleType[]>;
  token: WritableSignal<string | null>;
  clearUser: jest.Mock<void, []>;
}

interface MockAuthApiService {
  login: jest.Mock<Observable<{ success: boolean; message?: string }>, [{ email: string; password: string }]>;
  logout: jest.Mock<void, [string?]>;
  changePassword: jest.Mock<Observable<ChangePasswordResponse>, [string, string]>;
  refreshCurrentUser: jest.Mock<Observable<void>, []>;
}

const mockUser: User = {
  id: '1',
  idType: 'CC',
  idNumber: 1000000000,
  firstName: 'Simón',
  secondName: '',
  lastName: 'Guzmán',
  secondLastName: 'Anaya',
  codeNumber: 1234567890,
  email: 'test@test.com',
  state: UserState.active,
  roles: [UserRoleType.ADMINISTRADOR, UserRoleType.ESTUDIANTE]
};

describe('AuthService (Facade)', () => {
  let service: AuthService;
  let storage: MockAuthStorageService;
  let api: MockAuthApiService;
  let router: { navigate: jest.Mock };
  let notification: { security: jest.Mock };
  let inactividad: { iniciar: jest.Mock<void, [() => void]>; detener: jest.Mock };

  /** Crea el servicio con un token que vence en los segundos indicados (null = sin sesión). */
  const crearServicio = (segundosParaVencer: number | null = 3600) => {
    storage = {
      currentUser: signal(segundosParaVencer === null ? null : mockUser),
      isAuthenticated: signal(segundosParaVencer !== null),
      userRoles: signal(mockUser.roles),
      token: signal(segundosParaVencer === null ? null : crearJwtDePrueba(segundosParaVencer)),
      clearUser: jest.fn(() => {
        storage.currentUser.set(null);
        storage.isAuthenticated.set(false);
        storage.token.set(null);
      })
    };
    api = {
      login: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn(),
      refreshCurrentUser: jest.fn(() => of(undefined))
    };
    router = { navigate: jest.fn() };
    notification = { security: jest.fn() };
    inactividad = { iniciar: jest.fn(), detener: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthStorageService, useValue: storage },
        { provide: AuthApiService, useValue: api },
        { provide: Router, useValue: router },
        { provide: NotificationService, useValue: notification },
        { provide: SessionInactivityService, useValue: inactividad }
      ]
    });
    service = TestBed.inject(AuthService);
  };

  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => {}));
  afterEach(() => jest.restoreAllMocks());

  describe('Delegación a AuthApiService', () => {
    beforeEach(() => crearServicio());

    it('debe delegar login con las credenciales exactas', () => {
      const credentials = { email: 'a@a.com', password: '123' };
      service.login(credentials);
      expect(api.login).toHaveBeenCalledWith(credentials);
    });

    it('debe delegar logout', () => {
      service.logout();
      expect(api.logout).toHaveBeenCalledTimes(1);
    });

    it('debe delegar changePassword con los parámetros exactos', () => {
      service.changePassword('old', 'new');
      expect(api.changePassword).toHaveBeenCalledWith('old', 'new');
    });
  });

  describe('hasAnyRole', () => {
    beforeEach(() => crearServicio());

    it('es true si el usuario tiene al menos uno de los roles', () => {
      expect(service.hasAnyRole([UserRoleType.ADMINISTRADOR, 'otro_rol'])).toBe(true);
    });

    it('es false si no tiene ninguno', () => {
      expect(service.hasAnyRole([UserRoleType.DIRECTOR, UserRoleType.ASESOR])).toBe(false);
    });

    it('es false sin usuario en sesión', () => {
      storage.currentUser.set(null);
      expect(service.hasAnyRole([UserRoleType.ADMINISTRADOR])).toBe(false);
    });
  });

  describe('initialize', () => {
    it('sin sesión no consulta el backend', () => {
      crearServicio(null);
      service.initialize().subscribe();
      expect(api.refreshCurrentUser).not.toHaveBeenCalled();
    });

    it('con sesión refresca el usuario', () => {
      crearServicio();
      service.initialize().subscribe();
      expect(api.refreshCurrentUser).toHaveBeenCalledTimes(1);
    });

    it('si el refresco falla no rompe el arranque', () => {
      crearServicio();
      api.refreshCurrentUser.mockReturnValue(throwError(() => ({ status: 0 })));
      let completo = false;
      service.initialize().subscribe({ complete: () => completo = true });
      expect(completo).toBe(true);
    });
  });

  describe('expireSession', () => {
    it('limpia la sesión, avisa y navega al login', () => {
      crearServicio();
      service.expireSession();
      expect(storage.clearUser).toHaveBeenCalled();
      expect(notification.security).toHaveBeenCalledWith('Sesión finalizada', expect.any(String));
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    });

    it('no hace nada si ya no hay sesión (evita avisos repetidos)', () => {
      crearServicio(null);
      service.expireSession();
      expect(storage.clearUser).not.toHaveBeenCalled();
      expect(notification.security).not.toHaveBeenCalled();
    });

    it('se ejecuta sola cuando vence el token', fakeAsync(() => {
      crearServicio(5);
      TestBed.tick();
      tick(4000);
      expect(storage.clearUser).not.toHaveBeenCalled();
      tick(1500);
      expect(storage.clearUser).toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/auth/login']);
    }));
  });

  describe('inactividad', () => {
    it('vigila la sesión mientras hay sesión y deja de hacerlo al cerrarla', () => {
      crearServicio();
      TestBed.tick();
      expect(inactividad.iniciar).toHaveBeenCalledTimes(1);

      storage.clearUser();
      TestBed.tick();
      expect(inactividad.detener).toHaveBeenCalled();
    });

    it('sin sesión no vigila', () => {
      crearServicio(null);
      TestBed.tick();
      expect(inactividad.iniciar).not.toHaveBeenCalled();
    });

    it('al quedar inactiva cierra la sesión en el backend con el motivo y avisa', () => {
      crearServicio();
      TestBed.tick();
      const alInactivar = inactividad.iniciar.mock.calls[0][0];

      alInactivar();

      expect(api.logout).toHaveBeenCalledWith('inactividad');
      expect(notification.security).toHaveBeenCalledWith('Sesión cerrada por inactividad', expect.any(String));
    });
  });
});
