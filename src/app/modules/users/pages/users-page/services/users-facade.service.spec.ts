import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';

import { UsersFacadeService } from './users-facade.service';
import { UserService } from '../../../services/user.service';
import { UsersMapperService } from './users-mapper.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../../enum/identification-type.enum';
import { UserState } from '../../../enum/user-state.enum';

// ── Interfaz Local para el tipado estricto del Mapper ────────────────────────
// (Simula la interfaz real que exporta tu UsersMapperService)
interface UserTableRow {
  id?: string;
  fullName?: string;
  identificacion?: string;
  nombre?: string;
  apellidos?: string;
  estado?: string;
  allowedActions?: string[];
  originalData?: User;
}

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '123',
  idType: IdentificationType.CC,
  idNumber: 987654,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'López',
  email: 'juan@test.com',
  roles: [UserRoleType.DOCENTE],
  password: 'password123',
  codeNumber: 101,
  state: UserState.active,
  ...overrides
});

const createMockUserTableRow = (overrides: Partial<UserTableRow> = {}): UserTableRow => ({
  id: '123',
  fullName: 'Juan Pérez',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('Service: UsersFacadeService', () => {
  let service: UsersFacadeService;

  // Tipado estricto de las dependencias simuladas
  let mockUserService: {
    users: WritableSignal<User[]>;
    updateUserRolesMock: jest.Mock<Observable<void>, [string, UserRoleType[]]>;
    softDeleteUserMock: jest.Mock<Observable<void>, [string]>;
  };

  let mockMapper: {
    mapUserToTable: jest.Mock<UserTableRow, [User]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  let mockUser: User;

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante errores intencionales
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUser = createMockUser();

    mockUserService = {
      users: signal([mockUser]),
      updateUserRolesMock: jest.fn(),
      softDeleteUserMock: jest.fn()
    };

    mockMapper = {
      mapUserToTable: jest.fn().mockReturnValue(createMockUserTableRow())
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UsersFacadeService,
        { provide: UserService, useValue: mockUserService },
        { provide: UsersMapperService, useValue: mockMapper },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(UsersFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Fundamental para limpiar los espías de consola
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Señal Computada: usersTableData', () => {
    it('debería mapear los usuarios del UserService usando el MapperService', () => {
      const tableData = service.usersTableData();

      expect(mockMapper.mapUserToTable).toHaveBeenCalledWith(mockUser);
      expect(tableData).toEqual([createMockUserTableRow()]);
    });

    it('debería actualizarse reactivamente cuando la señal users cambie', () => {
      const mockMappedTableData = createMockUserTableRow({
        identificacion: '111',
        nombre: 'Reactivo',
        apellidos: 'Prueba',
        estado: 'Activo',
        allowedActions: ['ver'],
        originalData: mockUser
      });

      // Actualizamos el mock del mapper para el nuevo ciclo
      mockMapper.mapUserToTable.mockReturnValue(mockMappedTableData);

      // Mutamos la señal original inyectando un nuevo usuario con la fábrica
      mockUserService.users.set([createMockUser({ id: '999', firstName: 'Reactivo' })]);

      const tableData = service.usersTableData();

      expect(tableData).toEqual([mockMappedTableData]);
      expect(mockMapper.mapUserToTable).toHaveBeenCalledTimes(1); // Se llama 1 vez para el nuevo array
    });
  });

  describe('Método: findUserById', () => {
    it('debería retornar el usuario si existe en la señal', () => {
      const user = service.findUserById('123');
      expect(user).toEqual(mockUser);
    });

    it('debería retornar undefined si el usuario no existe', () => {
      const user = service.findUserById('999');
      expect(user).toBeUndefined();
    });
  });

  describe('Método: updateRoles', () => {
    it('debería ejecutar el flujo de éxito: notificar, llamar API, confirmar y ejecutar callback', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.updateUserRolesMock.mockReturnValue(of(void 0));

      service.updateRoles('123', [UserRoleType.ADMINISTRADOR], onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.CONFIRMATION }));

      expect(mockUserService.updateUserRolesMock).toHaveBeenCalledWith('123', [UserRoleType.ADMINISTRADOR]);
      expect(onSuccessSpy).toHaveBeenCalled();
    });

    it('debería ejecutar el flujo de error: notificar error, loguear y no ejecutar callback', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.updateUserRolesMock.mockReturnValue(throwError(() => new Error('API Error')));

      service.updateRoles('123', [UserRoleType.ADMINISTRADOR], onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.ERROR }));

      expect(onSuccessSpy).not.toHaveBeenCalled();

      // Verificamos que el catch() sí intentó registrar el error en consola (ya silenciada)
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Método: toggleUserStatus', () => {
    it('debería ejecutar flujo de éxito para HABILITAR (isEnabling = true)', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.softDeleteUserMock.mockReturnValue(of(void 0));

      service.toggleUserStatus('123', true, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, {
        title: 'Procesando acción',
        message: 'Estamos habilitando al usuario...',
        type: NotificationType.INFO
      });
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, {
        title: '¡Usuario habilitado!',
        message: 'El usuario ha sido habilitado correctamente.',
        type: NotificationType.CONFIRMATION
      });

      expect(mockUserService.softDeleteUserMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalled();
    });

    it('debería ejecutar flujo de éxito para DESHABILITAR (isEnabling = false)', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.softDeleteUserMock.mockReturnValue(of(void 0));

      service.toggleUserStatus('123', false, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, {
        title: 'Procesando acción',
        message: 'Estamos deshabilitando al usuario...',
        type: NotificationType.INFO
      });
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, {
        title: '¡Usuario deshabilitado!',
        message: 'El usuario ha sido deshabilitado correctamente.',
        type: NotificationType.CONFIRMATION
      });

      expect(onSuccessSpy).toHaveBeenCalled();
    });

    it('debería ejecutar flujo de error e informar adecuadamente según el intento', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.softDeleteUserMock.mockReturnValue(throwError(() => new Error('DB Timeout')));

      service.toggleUserStatus('123', true, onSuccessSpy);

      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, {
        title: 'Error al habilitar',
        message: 'No se pudo completar la acción. Intente de nuevo.',
        type: NotificationType.ERROR
      });

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
