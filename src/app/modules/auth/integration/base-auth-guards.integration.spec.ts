import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './../../../core/guards/auth.guard';
import { publicGuard } from './../../../core/guards/public.guard';
import { roleGuard } from './../../../core/guards/role.guard';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { User } from '../../../modules/users/interfaces/user.interface';
import { IdentificationType } from '../../../modules/users/enum/identification-type.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

const buildRoute = (roles?: UserRoleType[]): ActivatedRouteSnapshot => {
  const mockRoute: Partial<ActivatedRouteSnapshot> = {
    data: roles ? { roles } : {}
  };
  return mockRoute as ActivatedRouteSnapshot;
};

const buildRouterState = (): RouterStateSnapshot => {
  const mockState: Partial<RouterStateSnapshot> = {
    url: '/dummy-url'
  };
  return mockState as RouterStateSnapshot;
};

describe('Integración [Core]: Guards base de autenticación y roles', () => {
  let routerMock: { navigate: jest.Mock };
  let injector: Injector;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    routerMock = { navigate: jest.fn() };
  });

  function setup(authServiceMock: Partial<AuthService>) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    injector = TestBed.inject(Injector);
  }

  describe('authGuard', () => {
    it('permite el paso a un usuario autenticado y activo', () => {
      const activeUser = createMockUser({ id: 'u1', state: UserState.active });
      setup({ isAuthenticated: signal(true), currentUser: signal(activeUser), logout: jest.fn() });
      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), buildRouterState()));
      expect(result).toBe(true);
    });

    it('cierra la sesión (no solo bloquea) si el usuario está inhabilitado', () => {
      const inactiveUser = createMockUser({ id: 'u2', state: UserState.inactive });
      const logoutSpy = jest.fn();
      setup({ isAuthenticated: signal(true), currentUser: signal(inactiveUser), logout: logoutSpy });
      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), buildRouterState()));
      expect(result).toBe(false);
      expect(logoutSpy).toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('redirige a /auth/login si no hay ninguna sesión', () => {
      setup({ isAuthenticated: signal(false), currentUser: signal(null), logout: jest.fn() });
      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), buildRouterState()));
      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('publicGuard', () => {
    it('bloquea /auth/login si ya hay sesión activa, y redirige a notifications', () => {
      setup({ isAuthenticated: signal(true) });
      const result = runInInjectionContext(injector, () => publicGuard(buildRoute(), buildRouterState()));
      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('permite el acceso a un visitante sin sesión', () => {
      setup({ isAuthenticated: signal(false) });
      const result = runInInjectionContext(injector, () => publicGuard(buildRoute(), buildRouterState()));
      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('roleGuard', () => {
    it('permite el paso si el usuario autenticado tiene un rol permitido', () => {
      setup({ isAuthenticated: signal(true), hasAnyRole: (roles) => roles!.includes(UserRoleType.DIRECTOR) });
      const result = runInInjectionContext(injector, () =>
        roleGuard(buildRoute([UserRoleType.DIRECTOR, UserRoleType.ADMINISTRADOR]), buildRouterState())
      );
      expect(result).toBe(true);
    });

    it('bloquea y redirige a /notifications si el rol no está permitido', () => {
      setup({ isAuthenticated: signal(true), hasAnyRole: () => false });
      const result = runInInjectionContext(injector, () =>
        roleGuard(buildRoute([UserRoleType.ADMINISTRADOR]), buildRouterState())
      );
      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('no debe reventar si la ruta no declaró data.roles — trata la ausencia como undefined', () => {
      const hasAnyRoleSpy = jest.fn().mockReturnValue(false);
      setup({ isAuthenticated: signal(true), hasAnyRole: hasAnyRoleSpy });
      const emptyRoute: Partial<ActivatedRouteSnapshot> = { data: {} };
      const result = runInInjectionContext(injector, () =>
        roleGuard(emptyRoute as ActivatedRouteSnapshot, buildRouterState())
      );
      expect(hasAnyRoleSpy).toHaveBeenCalledWith(undefined);
      expect(result).toBe(false);
    });
  });
});
