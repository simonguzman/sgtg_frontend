import { TestBed } from '@angular/core/testing';
import { AuthStorageService } from './auth-storage.service';
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

  describe('Restauración de la sesión', () => {
    it('debe iniciar sin sesión si no hay nada guardado', () => {
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toBeNull();
      expect(service.token()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
    });

    it('debe restaurar la sesión si el token guardado sigue vigente', () => {
      localStorage.setItem('sgtg_token', token);
      localStorage.setItem('sgtg_session', JSON.stringify(mockUser));
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toEqual(mockUser);
      expect(service.token()).toBe(token);
      expect(service.isAuthenticated()).toBe(true);
      expect(service.userRoles()).toEqual(mockUser.roles);
      expect(service.hasValidToken()).toBe(true);
    });

    it('debe descartar la sesión si el token venció', () => {
      localStorage.setItem('sgtg_token', crearJwtDePrueba(-60));
      localStorage.setItem('sgtg_session', JSON.stringify(mockUser));
      service = TestBed.inject(AuthStorageService);
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('sgtg_token')).toBeNull();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });

    it('debe descartar una sesión del formato anterior (usuario sin token)', () => {
      localStorage.setItem('sgtg_session', JSON.stringify({ ...mockUser, password: '123' }));
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });

    it('debe descartar una sesión corrupta', () => {
      localStorage.setItem('sgtg_token', token);
      localStorage.setItem('sgtg_session', '{ invalid json }');
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('sgtg_token')).toBeNull();
    });

    it('debe descartar un token sin el formato JWT', () => {
      localStorage.setItem('sgtg_token', 'no-es-un-jwt');
      localStorage.setItem('sgtg_session', JSON.stringify(mockUser));
      service = TestBed.inject(AuthStorageService);
      expect(service.isAuthenticated()).toBe(false);
    });
  });

  describe('Operaciones de sesión', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthStorageService);
    });

    it('setSession guarda el token y el usuario', () => {
      service.setSession(token, mockUser);
      expect(service.isAuthenticated()).toBe(true);
      expect(localStorage.getItem('sgtg_token')).toBe(token);
      expect(JSON.parse(localStorage.getItem('sgtg_session')!)).toEqual(mockUser);
    });

    it('updateUser reemplaza el usuario sin tocar el token', () => {
      service.setSession(token, mockUser);
      service.updateUser({ ...mockUser, email: 'new@test.com' });
      expect(service.currentUser()?.email).toBe('new@test.com');
      expect(JSON.parse(localStorage.getItem('sgtg_session')!).email).toBe('new@test.com');
      expect(service.token()).toBe(token);
    });

    it('clearUser elimina el token y el usuario', () => {
      service.setSession(token, mockUser);
      service.clearUser();
      expect(service.currentUser()).toBeNull();
      expect(service.token()).toBeNull();
      expect(service.isAuthenticated()).toBe(false);
      expect(localStorage.getItem('sgtg_token')).toBeNull();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });

    it('sin usuario no hay sesión aunque exista token', () => {
      expect(service.hasValidToken()).toBe(false);
      service.setSession(crearJwtDePrueba(-1), mockUser);
      expect(service.hasValidToken()).toBe(false);
    });
  });
});
