import { TestBed } from '@angular/core/testing';
import { AuthStorageService, CLAVE_HAY_SESION } from './auth-storage.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const createMockUser = (overrides: Partial<User> = {}): User => ({
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
  roles: [UserRoleType.ESTUDIANTE],
  ...overrides
});

describe('AuthStorageService', () => {
  let service: AuthStorageService;
  const mockUser = createMockUser();
  const token = crearJwtDePrueba();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [AuthStorageService] });
  });

  describe('Al arrancar', () => {
    it('inicia sin sesión: el token nunca se guarda en el navegador', () => {
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toBeNull();
      expect(service.token()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.haySesionGuardada()).toBe(false);
    });

    it('borra la sesión que antes se guardaba en localStorage (con el token)', () => {
      localStorage.setItem('sgtg_token', token);
      localStorage.setItem('sgtg_session', JSON.stringify(mockUser));
      service = TestBed.inject(AuthStorageService);
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('sgtg_token')).toBeNull();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });

    it('sabe si hay una sesión que recuperar con el token de renovación', () => {
      localStorage.setItem(CLAVE_HAY_SESION, '1');
      service = TestBed.inject(AuthStorageService);
      expect(service.haySesionGuardada()).toBe(true);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Operaciones de sesión', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthStorageService);
    });

    it('setSession guarda el token y el usuario en memoria y solo la marca en localStorage', () => {
      service.setSession(token, mockUser);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.userRoles()).toEqual(mockUser.roles);
      expect(service.hasValidToken()).toBe(true);
      expect(Object.keys(localStorage)).toEqual([CLAVE_HAY_SESION]);
      expect(JSON.stringify(localStorage)).not.toContain(token);
    });

    it('setToken reemplaza el token sin tocar el usuario', () => {
      service.setSession(token, mockUser);
      const nuevo = crearJwtDePrueba(900);
      service.setToken(nuevo);
      expect(service.token()).toBe(nuevo);
      expect(service.currentUser()).toEqual(mockUser);
    });

    it('updateUser reemplaza el usuario sin tocar el token', () => {
      service.setSession(token, mockUser);
      service.updateUser({ ...mockUser, email: 'new@test.com' });
      expect(service.currentUser()?.email).toBe('new@test.com');
      expect(service.token()).toBe(token);
    });

    it('clearUser elimina el token, el usuario y la marca', () => {
      service.setSession(token, mockUser);
      service.clearUser();
      expect(service.currentUser()).toBeNull();
      expect(service.token()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(service.haySesionGuardada()).toBe(false);
    });

    it('un token vencido no es válido', () => {
      expect(service.hasValidToken()).toBe(false);
      service.setSession(crearJwtDePrueba(-1), mockUser);
      expect(service.hasValidToken()).toBe(false);
    });
  });
});
