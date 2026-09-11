import { TestBed } from '@angular/core/testing';

import { AuthStorageService } from './auth-storage.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  // Definimos un usuario base estricto que cumpla con la interfaz User real
  const baseUser: User = {
    id: '1',
    idType: 'CC',
    idNumber: 1000000000,
    firstName: 'Simón',
    secondName: '',
    lastName: 'Guzmán',
    secondLastName: 'Anaya',
    codeNumber: 1234567890,
    email: 'test@test.com',
    password: '123',
    state: UserState.active,
    roles: [UserRoleType.ESTUDIANTE] // Usamos un rol válido del Enum
  };

  return { ...baseUser, ...overrides } as User;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('AuthStorageService', () => {
  let service: AuthStorageService;

  // Creamos el mock usando la fábrica, cero casteos desconocidos
  const mockUser = createMockUser({ email: 'test@test.com' });

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Limpiamos el localStorage antes de cada prueba para evitar contaminación
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthStorageService]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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
      expect(service.userRoles()).toEqual(mockUser.roles);
    });

    it('debe limpiar el localStorage y retornar null si la sesión está corrupta', () => {
      // Este test cubre la rama del catch{} internamente
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
      // Reemplazamos el "as User" por un tipado directo
      const updatedUser: User = { ...mockUser, email: 'new@test.com' };

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
