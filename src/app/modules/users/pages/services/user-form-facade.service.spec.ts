import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { UserFormFacadeService } from './user-form-facade.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { User } from '../../interfaces/user.interface';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserState } from '../../enum/user-state.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: '',
  email: 'juan@test.com',
  password: '123',
  codeNumber: 1,
  state: UserState.active,
  roles: [UserRoleType.DOCENTE],
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Service: UserFormFacadeService', () => {
  let service: UserFormFacadeService;

  // Tipado estricto de las dependencias simuladas
  let mockUserService: {
    getUserByIdMock: jest.Mock<Observable<User | undefined>, [string]>;
    createUserMock: jest.Mock<Observable<User>, [User]>;
    updateUserMock: jest.Mock<Observable<User>, [string, Partial<User>]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  let mockRouter: {
    navigate: jest.Mock<Promise<boolean>, [string[]]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia de errores simulados (RxJS throwError)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      getUserByIdMock: jest.fn(),
      createUserMock: jest.fn(),
      updateUserMock: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      providers: [
        UserFormFacadeService,
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter },
      ],
    });

    service = TestBed.inject(UserFormFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Fundamental para limpiar los espías de consola
  });

  it('debería inicializarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Consultas (getUserById)', () => {
    it('debería llamar a getUserByIdMock del UserService', () => {
      const mockUser = createMockUser({ id: '123', firstName: 'Test' });
      mockUserService.getUserByIdMock.mockReturnValue(of(mockUser));

      service.getUserById('123').subscribe(user => {
        expect(user).toEqual(mockUser);
      });

      expect(mockUserService.getUserByIdMock).toHaveBeenCalledWith('123');
    });

    it('debería manejar el escenario de usuario no encontrado (handleNotFound)', () => {
      service.handleNotFound('No existe el usuario');

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Atención',
        message: 'No existe el usuario',
        type: NotificationType.ERROR
      });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
    });
  });

  describe('Creación de Usuarios (createUser)', () => {
    it('Flujo Exitoso: debería notificar, llamar al servicio, ejecutar onSuccess y navegar', () => {
      const mockUser = createMockUser({ firstName: 'Juan' });
      const onSuccessSpy = jest.fn();

      // Simulamos respuesta exitosa del backend
      mockUserService.createUserMock.mockReturnValue(of(mockUser));

      service.createUser(mockUser, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, {
        title: 'Procesando registro',
        message: 'Estamos procesando la información del usuario...',
        type: NotificationType.INFO
      });

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, {
        title: 'Usuario registrado',
        message: 'El usuario ha sido registrado correctamente.',
        type: NotificationType.CONFIRMATION
      });

      expect(onSuccessSpy).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('Flujo Fallido: debería notificar error si createUserMock falla y no navegar', () => {
      const mockUser = createMockUser({ firstName: 'Juan' });
      const onSuccessSpy = jest.fn();

      // Simulamos falla del backend
      mockUserService.createUserMock.mockReturnValue(throwError(() => new Error('Error de red')));

      service.createUser(mockUser, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de servidor',
        type: NotificationType.ERROR
      }));

      // Verificamos que registramos el error en consola pero de forma silenciosa
      expect(console.error).toHaveBeenCalled();

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Actualización de Usuarios (updateUser)', () => {
    it('Flujo Exitoso: debería notificar, actualizar, ejecutar onSuccess y navegar', () => {
      const mockUser = createMockUser({ firstName: 'Ana' });
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      mockUserService.updateUserMock.mockReturnValue(of(mockUser));

      service.updateUser('123', mockUser, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, {
        title: '¡Actualización exitosa!',
        message: 'Los datos del usuario han sido modificados correctamente.',
        type: NotificationType.CONFIRMATION
      });

      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/users']);
    });

    it('Flujo Fallido: debería notificar error, ejecutar onError y NO navegar', () => {
      const mockUser = createMockUser({ firstName: 'Ana' });
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      mockUserService.updateUserMock.mockReturnValue(throwError(() => new Error('Error de red')));

      service.updateUser('123', mockUser, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de actualización',
        type: NotificationType.ERROR
      }));

      expect(console.error).toHaveBeenCalled();

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
