import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { UserDetailsFacadeService } from './user-details-facade.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { User } from '../../../interfaces/user.interface';
import { IdentificationType } from '../../../enum/identification-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { UserState } from '../../../enum/user-state.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  idType: IdentificationType.CC,
  idNumber: 987654,
  firstName: 'Carlos',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'López',
  email: 'carlos@test.com',
  roles: [UserRoleType.DOCENTE],
  password: 'password123',
  codeNumber: 101,
  state: UserState.active,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Service: UserDetailsFacadeService', () => {
  let service: UserDetailsFacadeService;

  // Tipado estricto de las dependencias simuladas
  let mockRouter: {
    navigate: jest.Mock<Promise<boolean>, [string[]]>;
  };

  let mockUserService: {
    getUserByIdMock: jest.Mock<Observable<User | undefined>, [string]>;
  };

  let mockAuthService: {
    // Simulamos la llamada al signal currentUser() mediante una función mockeada
    currentUser: jest.Mock<User | null, []>;
  };

  const mockUser = createMockUser({ id: '123', firstName: 'Carlos', email: 'carlos@test.com' });
  const mockCurrentUser = createMockUser({ id: '999', firstName: 'Mi Perfil', email: 'yo@test.com' });

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia de errores intencionales
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    mockUserService = {
      getUserByIdMock: jest.fn()
    };

    mockAuthService = {
      currentUser: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UserDetailsFacadeService,
        { provide: Router, useValue: mockRouter },
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(UserDetailsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  it('debería inicializarse con los estados por defecto', () => {
    expect(service).toBeTruthy();
    expect(service.isLoading()).toBe(true);
    expect(service.isMyProfile()).toBe(false);
    expect(service.user()).toBeUndefined();
  });

  describe('Carga de Usuario Específico (Con ID)', () => {
    it('debería cargar datos del UserService, apagar isLoading y desactivar isMyProfile', () => {
      mockUserService.getUserByIdMock.mockReturnValue(of(mockUser));

      service.loadUser('123');

      expect(service.isMyProfile()).toBe(false);
      expect(mockUserService.getUserByIdMock).toHaveBeenCalledWith('123');
      expect(service.user()).toEqual(mockUser);
      expect(service.isLoading()).toBe(false);
    });

    it('debería apagar isLoading incluso si ocurre un error en la carga', () => {
      mockUserService.getUserByIdMock.mockReturnValue(throwError(() => new Error('Error')));

      service.loadUser('123');

      expect(service.isMyProfile()).toBe(false);
      expect(mockUserService.getUserByIdMock).toHaveBeenCalledWith('123');
      expect(service.user()).toBeUndefined(); // Se asegura de que no se setea data corrupta
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Carga del Perfil Propio (Sin ID)', () => {
    it('debería cargar datos del AuthService, apagar isLoading y activar isMyProfile', () => {
      mockAuthService.currentUser.mockReturnValue(mockCurrentUser);

      service.loadUser(null);

      expect(service.isMyProfile()).toBe(true);
      expect(mockAuthService.currentUser).toHaveBeenCalled();
      expect(service.user()).toEqual(mockCurrentUser);
      expect(service.isLoading()).toBe(false);
    });

    it('debería manejar el caso donde no hay un usuario autenticado', () => {
      mockAuthService.currentUser.mockReturnValue(null);

      service.loadUser(null);

      expect(service.isMyProfile()).toBe(true);
      expect(service.user()).toBeUndefined();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('Lógica de Navegación (goBack)', () => {
    it('debería navegar a /notifications si está en modo "Mi Perfil"', () => {
      mockAuthService.currentUser.mockReturnValue(mockCurrentUser);
      service.loadUser(null);

      service.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/notifications']);
    });

    it('debería navegar a /users si está consultando otro usuario', () => {
      mockUserService.getUserByIdMock.mockReturnValue(of(mockUser));
      service.loadUser('123');

      service.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
    });
  });
});
