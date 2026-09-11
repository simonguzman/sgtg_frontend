import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { Observable, of } from 'rxjs';

import { UserService } from './user.service';
import { UserStorageService } from './user-storage.service';
import { UserApiService } from './user-api.service';
import { UserFormatterService } from './user-formatter.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-1111-1111-111111111111',
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

describe('UserService', () => {
  let service: UserService;

  // Señal controlable para simular el estado reactivo del usuario actual
  let mockCurrentUserSignal: WritableSignal<User | null>;
  let mockUser: User;

  // Reemplazamos 'unknown' por el tipado estricto literal de cada servicio
  let storageSpy: {
    currentUser: WritableSignal<User | null>;
    users: WritableSignal<User[]>;
    students: WritableSignal<User[]>;
    teachers: WritableSignal<User[]>;
    advisors: WritableSignal<User[]>;
    potentialDirectors: WritableSignal<User[]>;
    setCurrentUser: jest.Mock<void, [User | null]>;
    getUsersSnapshot: jest.Mock<User[], []>;
  };

  let apiSpy: {
    getUserById: jest.Mock<Observable<User | undefined>, [string]>;
    getUsersByRole: jest.Mock<Observable<User[]>, [UserRoleType]>;
    createUser: jest.Mock<Observable<User>, [User]>;
    updateUser: jest.Mock<Observable<User>, [string, Partial<User>]>;
    updateUserPassword: jest.Mock<Observable<void>, [string, string]>;
    softDeleteUser: jest.Mock<Observable<void>, [string]>;
    updateUserRoles: jest.Mock<Observable<void>, [string, UserRoleType[]]>;
    addRoleToUser: jest.Mock<Observable<void>, [string, UserRoleType]>;
    removeRoleFromUser: jest.Mock<Observable<void>, [string, UserRoleType]>;
    removeRolesFromUsers: jest.Mock<Observable<void>, [string[], UserRoleType[]]>;
  };

  let formatterSpy: {
    formatFullName: jest.Mock<string, [User]>;
    getUserFullName: jest.Mock<string, [string | undefined]>;
    getAuthorsNames: jest.Mock<string, [(string | User)[] | undefined]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUser = createMockUser();
    mockCurrentUserSignal = signal<User | null>(null);

    // Mocks estrictos inicializados
    storageSpy = {
      currentUser: mockCurrentUserSignal,
      users: signal([mockUser]),
      students: signal([]),
      teachers: signal([mockUser]),
      advisors: signal([]),
      potentialDirectors: signal([mockUser]),
      setCurrentUser: jest.fn(),
      getUsersSnapshot: jest.fn().mockReturnValue([mockUser]),
    };

    apiSpy = {
      getUserById: jest.fn().mockReturnValue(of(mockUser)),
      getUsersByRole: jest.fn().mockReturnValue(of([mockUser])),
      createUser: jest.fn().mockReturnValue(of(mockUser)),
      updateUser: jest.fn().mockReturnValue(of(mockUser)),
      updateUserPassword: jest.fn().mockReturnValue(of(void 0)),
      softDeleteUser: jest.fn().mockReturnValue(of(void 0)),
      updateUserRoles: jest.fn().mockReturnValue(of(void 0)),
      addRoleToUser: jest.fn().mockReturnValue(of(void 0)),
      removeRoleFromUser: jest.fn().mockReturnValue(of(void 0)),
      removeRolesFromUsers: jest.fn().mockReturnValue(of(void 0))
    };

    formatterSpy = {
      formatFullName: jest.fn().mockReturnValue('Juan Pérez'),
      getUserFullName: jest.fn().mockReturnValue('Juan Pérez'),
      getAuthorsNames: jest.fn().mockReturnValue('Juan Pérez')
    };

    TestBed.configureTestingModule({
      providers: [
        UserService,
        { provide: UserStorageService, useValue: storageSpy },
        { provide: UserApiService, useValue: apiSpy },
        { provide: UserFormatterService, useValue: formatterSpy }
      ]
    });

    service = TestBed.inject(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar espías de consola
  });

  it('debería inicializarse correctamente', () => {
    expect(service).toBeTruthy();
  });

  // ==========================================
  // ESTADO REACTIVO (Computed Signals)
  // ==========================================
  describe('Estado Reactivo y Señales Computadas', () => {
    it('debería retornar textos por defecto ("Invitado", "No identificado") si no hay sesión', () => {
      mockCurrentUserSignal.set(null);
      expect(service.currentUserFullName()).toBe('Invitado');
      expect(service.currentDirectorName()).toBe('No identificado');
    });

    it('debería retornar el nombre formateado si existe un usuario en sesión', () => {
      mockCurrentUserSignal.set(mockUser);

      expect(service.currentUserFullName()).toBe('Juan Pérez');
      expect(service.currentDirectorName()).toBe('Juan Pérez');
      expect(formatterSpy.formatFullName).toHaveBeenCalledWith(mockUser);
    });
  });

  // ==========================================
  // GESTIÓN DE SESIÓN
  // ==========================================
  describe('Gestión de Sesión', () => {
    it('login() debería delegar a storage.setCurrentUser() con el usuario completo', () => {
      service.login(mockUser);
      expect(storageSpy.setCurrentUser).toHaveBeenCalledWith(mockUser);
    });

    it('logout() debería delegar a storage.setCurrentUser() enviando null', () => {
      service.logout();
      expect(storageSpy.setCurrentUser).toHaveBeenCalledWith(null);
    });
  });

  // ==========================================
  // DELEGACIÓN: QUERIES & MUTATIONS
  // ==========================================
  describe('Delegación de Consultas y Mutaciones', () => {
    it('getAllUsers() y getUsersSnapshot() deberían llamar al snapshot del storage', () => {
      expect(service.getAllUsers()).toEqual([mockUser]);
      expect(service.getUsersSnapshot()).toEqual([mockUser]);
      expect(storageSpy.getUsersSnapshot).toHaveBeenCalledTimes(2);
    });

    it('getUserByIdMock() debería delegar al API Service', () => {
      service.getUserByIdMock('111').subscribe();
      expect(apiSpy.getUserById).toHaveBeenCalledWith('111');
    });

    it('getUsersByRole() debería delegar al API Service', () => {
      service.getUsersByRole(UserRoleType.DOCENTE).subscribe();
      expect(apiSpy.getUsersByRole).toHaveBeenCalledWith(UserRoleType.DOCENTE);
    });

    it('createUserMock() debería delegar la creación al API Service', () => {
      service.createUserMock(mockUser).subscribe();
      expect(apiSpy.createUser).toHaveBeenCalledWith(mockUser);
    });

    it('updateUserMock() debería delegar al API Service', () => {
      const changes = { firstName: 'Carlos' };
      service.updateUserMock('111', changes).subscribe();
      expect(apiSpy.updateUser).toHaveBeenCalledWith('111', changes);
    });

    it('updateUserPasswordMock() debería delegar al API Service', () => {
      service.updateUserPasswordMock('111', 'newpass').subscribe();
      expect(apiSpy.updateUserPassword).toHaveBeenCalledWith('111', 'newpass');
    });

    it('softDeleteUserMock() debería delegar la eliminación lógica al API Service', () => {
      service.softDeleteUserMock('123').subscribe();
      expect(apiSpy.softDeleteUser).toHaveBeenCalledWith('123');
    });

    it('updateUserRolesMock() debería delegar al API Service', () => {
      service.updateUserRolesMock('111', [UserRoleType.ADMINISTRADOR]).subscribe();
      expect(apiSpy.updateUserRoles).toHaveBeenCalledWith('111', [UserRoleType.ADMINISTRADOR]);
    });

    it('addRoleToUser() debería delegar al API Service', () => {
      service.addRoleToUser('111', UserRoleType.ASESOR).subscribe();
      expect(apiSpy.addRoleToUser).toHaveBeenCalledWith('111', UserRoleType.ASESOR);
    });

    it('removeRoleFromUser() debería delegar al API Service', () => {
      service.removeRoleFromUser('111', UserRoleType.DOCENTE).subscribe();
      expect(apiSpy.removeRoleFromUser).toHaveBeenCalledWith('111', UserRoleType.DOCENTE);
    });

    it('removeRolesFromUsersMock() debería delegar al API Service', () => {
      service.removeRolesFromUsersMock(['111', '222'], [UserRoleType.DOCENTE]).subscribe();
      expect(apiSpy.removeRolesFromUsers).toHaveBeenCalledWith(['111', '222'], [UserRoleType.DOCENTE]);
    });
  });

  // ==========================================
  // DELEGACIÓN: FORMATO
  // ==========================================
  describe('Delegación de Formateo de Texto', () => {
    it('formatFullName() debería delegar al Formatter Service', () => {
      service.formatFullName(mockUser);
      expect(formatterSpy.formatFullName).toHaveBeenCalledWith(mockUser);
    });

    it('getUserFullName() debería delegar al Formatter Service', () => {
      service.getUserFullName('111');
      expect(formatterSpy.getUserFullName).toHaveBeenCalledWith('111');
    });

    it('getAuthorsNames() debería delegar al Formatter Service', () => {
      service.getAuthorsNames([mockUser, 'uuid-123']);
      expect(formatterSpy.getAuthorsNames).toHaveBeenCalledWith([mockUser, 'uuid-123']);
    });
  });
});
