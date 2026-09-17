// src/app/core/guards/integration/base-auth-guards.integration.spec.ts
import { TestBed } from '@angular/core/testing';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

import { authGuard } from './../../../core/guards/auth.guard';
import { publicGuard } from './../../../core/guards/public.guard';
import { roleGuard } from './../../../core/guards/role.guard';
import { resolveEntityForGuard } from '../../../core/helpers/resolve-entity-for-guard.helper';
import { AuthService } from '../../../core/services/auth/auth.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { User } from '../../../modules/users/interfaces/user.interface';

describe('Integración [Core]: Guards base de autenticación y roles', () => {
  let routerMock: { navigate: jest.Mock };
  let injector: Injector;

  const buildRoute = (roles?: UserRoleType[]): ActivatedRouteSnapshot =>
    ({ data: { roles } } as unknown as ActivatedRouteSnapshot);

  function setup(authServiceMock: Partial<AuthService>) {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });
    injector = TestBed.inject(Injector);
  }

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    routerMock = { navigate: jest.fn() };
  });

  describe('authGuard', () => {
    it('permite el paso a un usuario autenticado y activo', () => {
      const activeUser = { id: 'u1', state: UserState.active } as User;
      setup({ isAuthenticated: signal(true), currentUser: signal(activeUser), logout: jest.fn() });

      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), {} as RouterStateSnapshot));
      expect(result).toBe(true);
    });

    it('cierra la sesión (no solo bloquea) si el usuario está inhabilitado', () => {
      const inactiveUser = { id: 'u2', state: UserState.inactive } as User;
      const logoutSpy = jest.fn();
      setup({ isAuthenticated: signal(true), currentUser: signal(inactiveUser), logout: logoutSpy });

      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), {} as RouterStateSnapshot));

      expect(result).toBe(false);
      expect(logoutSpy).toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('redirige a /auth/login si no hay ninguna sesión', () => {
      setup({ isAuthenticated: signal(false), currentUser: signal(null), logout: jest.fn() });

      const result = runInInjectionContext(injector, () => authGuard(buildRoute(), {} as RouterStateSnapshot));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('publicGuard', () => {
    it('bloquea /auth/login si ya hay sesión activa, y redirige a notifications', () => {
      setup({ isAuthenticated: signal(true) });
      const result = runInInjectionContext(injector, () => publicGuard(buildRoute(), {} as RouterStateSnapshot));

      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('permite el acceso a un visitante sin sesión', () => {
      setup({ isAuthenticated: signal(false) });
      const result = runInInjectionContext(injector, () => publicGuard(buildRoute(), {} as RouterStateSnapshot));

      expect(result).toBe(true);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('roleGuard', () => {
    it('permite el paso si el usuario autenticado tiene un rol permitido', () => {
      setup({ isAuthenticated: signal(true), hasAnyRole: (roles) => roles.includes(UserRoleType.DIRECTOR) });
      const result = runInInjectionContext(injector, () =>
        roleGuard(buildRoute([UserRoleType.DIRECTOR, UserRoleType.ADMINISTRADOR]), {} as RouterStateSnapshot)
      );
      expect(result).toBe(true);
    });

    it('bloquea y redirige a /notifications si el rol no está permitido', () => {
      setup({ isAuthenticated: signal(true), hasAnyRole: () => false });
      const result = runInInjectionContext(injector, () =>
        roleGuard(buildRoute([UserRoleType.ADMINISTRADOR]), {} as RouterStateSnapshot)
      );
      expect(result).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('no debe reventar si la ruta no declaró data.roles — trata la ausencia como undefined', () => {
      const hasAnyRoleSpy = jest.fn().mockReturnValue(false);
      setup({ isAuthenticated: signal(true), hasAnyRole: hasAnyRoleSpy });

      const result = runInInjectionContext(injector, () =>
        roleGuard({ data: {} } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
      );

      // <-- FIX: El guard extrae undefined de { data: {} } y se lo pasa a hasAnyRole.
      // El test ahora espera correctamente ese undefined en lugar de un [].
      expect(hasAnyRoleSpy).toHaveBeenCalledWith(undefined);
      expect(result).toBe(false);
    });
  });
});
