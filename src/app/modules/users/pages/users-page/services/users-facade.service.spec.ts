import { AuthService } from '../../../../../core/services/auth/auth.service';
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersFacadeService } from './users-facade.service';
import { UserService } from '../../../services/user.service';
import { UsersMapperService } from './users-mapper.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { User } from '../../../interfaces/user.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../../enum/identification-type.enum';
import { UserState } from '../../../enum/user-state.enum';

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

/** Sesión simulada: el id del usuario que gestiona */
const sesion = signal<{ id: string } | null>({ id: '99' });
const mockAuthService = { currentUser: sesion, logout: jest.fn() };

describe('Service: UsersFacadeService', () => {
  let service: UsersFacadeService;

  let mockUserService: {
    users: WritableSignal<User[]>;
    loadManagedUsers: jest.Mock;
    updateUserRoles: jest.Mock<Observable<void>, [string, UserRoleType[]]>;
    softDeleteUser: jest.Mock<Observable<void>, [string]>;
  };

  let mockMapper: {
    mapUserToTable: jest.Mock<UserTableRow, [User, boolean]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  let mockUser: User;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUser = createMockUser();

    mockUserService = {
      users: signal([mockUser]),
      loadManagedUsers: jest.fn().mockReturnValue(of([{ user: mockUser, editable: true }])),
      updateUserRoles: jest.fn(),
      softDeleteUser: jest.fn()
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
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: AuthService, useValue: mockAuthService }
      ]
    });

    service = TestBed.inject(UsersFacadeService);
    // La tabla muestra los usuarios que gestiona el usuario de la sesión
    service.loadUsers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Señal Computada: usersTableData', () => {
    it('debería mapear los usuarios gestionados usando el MapperService', () => {
      const tableData = service.usersTableData();
      expect(mockUserService.loadManagedUsers).toHaveBeenCalled();
      expect(mockMapper.mapUserToTable).toHaveBeenCalledWith(mockUser, true);
      expect(tableData).toEqual([createMockUserTableRow()]);
    });

    it('debería actualizarse al volver a cargar los usuarios gestionados', () => {
      const mockMappedTableData = createMockUserTableRow({
        identificacion: '111',
        nombre: 'Reactivo',
        apellidos: 'Prueba',
        estado: 'Activo',
        allowedActions: ['ver'],
        originalData: mockUser
      });
      mockMapper.mapUserToTable.mockReturnValue(mockMappedTableData);
      const otro = createMockUser({ id: '999', firstName: 'Reactivo' });
      mockUserService.loadManagedUsers.mockReturnValue(of([{ user: otro, editable: false }]));
      service.loadUsers();
      const tableData = service.usersTableData();
      expect(tableData).toEqual([mockMappedTableData]);
      expect(mockMapper.mapUserToTable).toHaveBeenCalledWith(otro, false);
    });

    it('debería mostrar primero el usuario más reciente (id mayor)', () => {
      const antiguo = createMockUser({ id: '5' });
      const nuevo = createMockUser({ id: '120' });
      const medio = createMockUser({ id: '40' });
      mockUserService.loadManagedUsers.mockReturnValue(of([
        { user: antiguo, editable: true }, { user: nuevo, editable: true }, { user: medio, editable: true }
      ]));
      mockMapper.mapUserToTable.mockImplementation((user: { id: string }) => ({ id: user.id }));
      service.loadUsers();
      expect(service.usersTableData().map((fila: any) => fila.id)).toEqual(['120', '40', '5']);
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
      mockUserService.updateUserRoles.mockReturnValue(of(void 0));
      service.updateRoles('123', [UserRoleType.ADMINISTRADOR], onSuccessSpy);
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.CONFIRMATION }));
      expect(mockUserService.updateUserRoles).toHaveBeenCalledWith('123', [UserRoleType.ADMINISTRADOR]);
      expect(onSuccessSpy).toHaveBeenCalled();
      // La tabla se recarga con los roles nuevos
      expect(mockUserService.loadManagedUsers).toHaveBeenCalledTimes(2);
    });

    it('debería ejecutar el flujo de error: notificar error, loguear y no ejecutar callback', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.updateUserRoles.mockReturnValue(throwError(() => new Error('API Error')));
      service.updateRoles('123', [UserRoleType.ADMINISTRADOR], onSuccessSpy);
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.ERROR }));
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Método: toggleUserStatus', () => {
    it('debería ejecutar flujo de éxito para HABILITAR (isEnabling = true)', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.softDeleteUser.mockReturnValue(of(void 0));
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
      expect(mockUserService.softDeleteUser).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalled();
    });

    it('debería ejecutar flujo de éxito para DESHABILITAR (isEnabling = false)', () => {
      const onSuccessSpy = jest.fn();
      mockUserService.softDeleteUser.mockReturnValue(of(void 0));
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
      mockUserService.softDeleteUser.mockReturnValue(throwError(() => new Error('DB Timeout')));
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

  describe('Cambio del Comité', () => {
    const SISTEMAS = { id: 1, name: 'Departamento de Sistemas' };
    const TELEMATICA = { id: 2, name: 'Departamento de Telemática' };
    let changeCommittee: jest.Mock;

    /** Gestiona: el Comité de Sistemas (99), dos docentes de Sistemas (uno inactivo), uno de Telemática y un estudiante */
    const cargar = () => {
      mockUserService.loadManagedUsers.mockReturnValue(of([
        { user: createMockUser({ id: '99', roles: [UserRoleType.COMITE, UserRoleType.DOCENTE], department: SISTEMAS }), editable: false },
        { user: createMockUser({ id: '5', firstName: 'Ana', lastName: 'Mora', department: SISTEMAS }), editable: true },
        { user: createMockUser({ id: '6', department: SISTEMAS, state: UserState.inactive }), editable: true },
        { user: createMockUser({ id: '7', department: TELEMATICA }), editable: true },
        { user: createMockUser({ id: '8', roles: [UserRoleType.ESTUDIANTE] }), editable: true }
      ]));
      service.loadUsers();
    };

    beforeEach(() => {
      changeCommittee = jest.fn();
      Object.assign(mockUserService, { changeCommittee });
      mockAuthService.logout.mockClear();
      sesion.set({ id: '1' });
    });

    it('ofrece los departamentos de los docentes que gestiona, su Comité actual y los docentes activos que pueden recibirlo', () => {
      cargar();

      expect(service.committeeDepartments()).toEqual([SISTEMAS, TELEMATICA]);
      expect(service.committeeOf(1)?.id).toBe('99');
      expect(service.committeeOf(2)).toBeUndefined();
      expect(service.committeeCandidates(1).map(user => user.id)).toEqual(['5']);
    });

    it('al nombrar otro Comité avisa y recarga la lista', () => {
      cargar();
      changeCommittee.mockReturnValue(of(createMockUser({ id: '5', firstName: 'Ana', lastName: 'Mora' })));
      const alTerminar = jest.fn();

      service.changeCommittee('5', alTerminar);

      expect(changeCommittee).toHaveBeenCalledWith('5');
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Comité actualizado', type: NotificationType.CONFIRMATION
      }));
      expect(alTerminar).toHaveBeenCalled();
      expect(mockAuthService.logout).not.toHaveBeenCalled();
    });

    it('si el Comité cede el suyo, cierra su sesión', () => {
      sesion.set({ id: '99' });
      cargar();
      changeCommittee.mockReturnValue(of(createMockUser({ id: '5', firstName: 'Ana', lastName: 'Mora' })));

      service.changeCommittee('5', jest.fn());

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Rol de Comité cedido' }));
      expect(mockAuthService.logout).toHaveBeenCalled();
    });

    it('si el backend lo rechaza muestra su mensaje y libera el modal', () => {
      cargar();
      changeCommittee.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { message: 'Ese docente codirige un trabajo de grado en curso de este departamento.' }
      })));
      const alFallar = jest.fn();

      service.changeCommittee('5', jest.fn(), alFallar);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'No se cambió el Comité',
        message: 'Ese docente codirige un trabajo de grado en curso de este departamento.'
      }));
      expect(alFallar).toHaveBeenCalled();
    });
  });
});
