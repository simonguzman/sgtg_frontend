import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Observable } from 'rxjs';

import { AuthService } from './auth.service';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService } from './auth-api.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockAuthStorageService {
  currentUser: WritableSignal<User | null>;
  isAuthenticated: WritableSignal<boolean>;
  userRoles: WritableSignal<UserRoleType[]>;
}

interface MockAuthApiService {
  login: jest.Mock<Observable<{ success: boolean; message?: string }>, [{ email: string; password: string }]>;
  logout: jest.Mock<void, []>;
  changePassword: jest.Mock<Observable<ChangePasswordResponse>, [string, string]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
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
    roles: [UserRoleType.ADMINISTRADOR, UserRoleType.ESTUDIANTE]
  };

  return { ...baseUser, ...overrides } as User;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('AuthService (Facade)', () => {
  let service: AuthService;
  let mockStorageService: MockAuthStorageService;
  let mockApiService: MockAuthApiService;

  // Cero casteos, usamos la fábrica tipada
  const mockUser = createMockUser();

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockStorageService = {
      currentUser: signal(mockUser),
      isAuthenticated: signal(true),
      userRoles: signal(mockUser.roles)
    };

    mockApiService = {
      login: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthStorageService, useValue: mockStorageService },
        { provide: AuthApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Delegación de métodos a API (AuthApiService)', () => {
    it('debe delegar login a AuthApiService con las credenciales exactas', () => {
      const credentials = { email: 'a@a.com', password: '123' };

      service.login(credentials);

      expect(mockApiService.login).toHaveBeenCalledWith(credentials);
      expect(mockApiService.login).toHaveBeenCalledTimes(1);
    });

    it('debe delegar logout a AuthApiService', () => {
      service.logout();

      expect(mockApiService.logout).toHaveBeenCalledTimes(1);
    });

    it('debe delegar changePassword a AuthApiService con los parámetros exactos', () => {
      service.changePassword('old', 'new');

      expect(mockApiService.changePassword).toHaveBeenCalledWith('old', 'new');
      expect(mockApiService.changePassword).toHaveBeenCalledTimes(1);
    });
  });

  describe('Lógica derivada (hasAnyRole)', () => {
    it('debe retornar true si el usuario tiene al menos uno de los roles requeridos', () => {
      // Usamos el Enum real para asegurar consistencia
      expect(service.hasAnyRole([UserRoleType.ADMINISTRADOR, 'otro_rol'])).toBeTruthy();
      expect(service.hasAnyRole([UserRoleType.ESTUDIANTE])).toBeTruthy();
    });

    it('debe retornar false si el usuario no tiene ninguno de los roles requeridos', () => {
      expect(service.hasAnyRole([UserRoleType.DIRECTOR, UserRoleType.ASESOR])).toBeFalsy();
    });

    it('debe retornar false si no hay usuario en sesión (currentUser es null)', () => {
      mockStorageService.currentUser.set(null); // Simulamos cierre de sesión

      expect(service.hasAnyRole([UserRoleType.ADMINISTRADOR])).toBeFalsy();
    });
  });
});
