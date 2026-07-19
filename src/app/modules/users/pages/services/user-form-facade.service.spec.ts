/* tslint:disable:no-unused-variable */
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { UserFormFacadeService } from './user-form-facade.service';
import { UserService } from '../../services/user.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { User } from '../../interfaces/user.interface';

describe('Service: UserCreateFormFacadeService', () => {
  let service: UserFormFacadeService;
  let mockUserService: {
    getUserByIdMock: jest.Mock;
    createUserMock: jest.Mock;
    updateUserMock: jest.Mock;
  };

  let mockNotificationService: {
    show: jest.Mock;
  };

  let mockRouter: {
    navigate: jest.Mock;
  };

  beforeEach(() => {
    mockUserService = {
      getUserByIdMock: jest.fn(),
      createUserMock: jest.fn(),
      updateUserMock: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn(),
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

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería inicializarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Consultas (getUserById)', () => {
    it('debería llamar a getUserByIdMock del UserService', () => {
      const mockUser = { id: '123', firstName: 'Test' } as User;
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
      const mockUser = { firstName: 'Juan' } as User;
      const onSuccessSpy = jest.fn();
      mockUserService.createUserMock.mockReturnValue(of({}));

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

    it('Flujo Fallido: debería notificar error si createUserMock falla', () => {
      const mockUser = { firstName: 'Juan' } as User;
      const onSuccessSpy = jest.fn();
      mockUserService.createUserMock.mockReturnValue(throwError(() => new Error('Error')));

      service.createUser(mockUser, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de servidor',
        type: NotificationType.ERROR
      }));

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Actualización de Usuarios (updateUser)', () => {
    it('Flujo Exitoso: debería notificar, actualizar, ejecutar onSuccess y navegar', () => {
      const mockUser = { firstName: 'Ana' } as User;
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();
      mockUserService.updateUserMock.mockReturnValue(of({}));

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

    it('Flujo Fallido: debería notificar error, NO navegar y ejecutar onError', () => {
      const mockUser = { firstName: 'Ana' } as User;
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();
      mockUserService.updateUserMock.mockReturnValue(throwError(() => new Error('Error de red')));

      service.updateUser('123', mockUser, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de actualización',
        type: NotificationType.ERROR
      }));
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
