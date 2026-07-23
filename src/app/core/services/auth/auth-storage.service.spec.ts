import { TestBed } from '@angular/core/testing';
import { AuthStorageService } from './auth-storage.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';

describe('AuthStorageService', () => {
  let service: AuthStorageService;
  const mockUser = {
    id: '1',
    email: 'test@test.com',
    roles: ['admin'] as unknown as UserRoleType[]
  } as unknown as User;

  beforeEach(() => {
    // Limpiamos el localStorage antes de cada prueba para evitar contaminación
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthStorageService]
    });
  });

  describe('Inicialización y getStoredSession', () => {
    it('debe inicializar con null si no hay sesión en localStorage', () => {
      service = TestBed.inject(AuthStorageService);
      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalsy();
    });

    it('debe inicializar con el usuario si existe sesión válida en localStorage', () => {
      localStorage.setItem('sgtg_session', JSON.stringify(mockUser));
      service = TestBed.inject(AuthStorageService);

      expect(service.currentUser()).toEqual(mockUser);
      expect(service.isAuthenticated()).toBeTruthy();
      expect(service.userRoles()).toEqual(['admin']);
    });

    it('debe limpiar el localStorage y retornar null si la sesión está corrupta', () => {
      localStorage.setItem('sgtg_session', '{ invalid json }');
      service = TestBed.inject(AuthStorageService);

      expect(service.currentUser()).toBeNull();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });
  });

  describe('Operaciones de estado (setUser, updateUser, clearUser)', () => {
    beforeEach(() => {
      service = TestBed.inject(AuthStorageService);
    });

    it('debe guardar el usuario en el signal y en localStorage (setUser)', () => {
      service.setUser(mockUser);

      expect(service.currentUser()).toEqual(mockUser);
      expect(JSON.parse(localStorage.getItem('sgtg_session')!)).toEqual(mockUser);
    });

    it('debe actualizar el usuario correctamente (updateUser)', () => {
      const updatedUser = { ...mockUser, email: 'new@test.com' } as User;

      service.updateUser(updatedUser);

      expect(service.currentUser()?.email).toBe('new@test.com');
      expect(JSON.parse(localStorage.getItem('sgtg_session')!).email).toBe('new@test.com');
    });

    it('debe limpiar el estado y el localStorage (clearUser)', () => {
      service.setUser(mockUser);
      service.clearUser();

      expect(service.currentUser()).toBeNull();
      expect(service.isAuthenticated()).toBeFalsy();
      expect(localStorage.getItem('sgtg_session')).toBeNull();
    });
  });
});
