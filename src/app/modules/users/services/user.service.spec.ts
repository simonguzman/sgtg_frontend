import { TestBed } from '@angular/core/testing';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';
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

describe('UserService', () => {
  let service: UserService;
  let mockCurrentUserSignal: WritableSignal<User | null>;
  let mockUser: User;
  let storageSpy: {
    currentUser: WritableSignal<User | null>;
    users: WritableSignal<User[]>;
    students: WritableSignal<User[]>;
    teachers: WritableSignal<User[]>;
    advisors: WritableSignal<User[]>;
    potentialDirectors: WritableSignal<User[]>;
    setCurrentUser: jest.Mock<void, [User | null]>;
    getUsersSnapshot: jest.Mock<User[], []>;
    updateUsersList: jest.Mock<void, [(users: User[]) => User[]]>;
  };
  let isAuthenticated: WritableSignal<boolean>;

  let apiSpy: {
    getUserById: jest.Mock<Observable<User | undefined>, [string]>;
    getUsersByRole: jest.Mock<Observable<User[]>, [UserRoleType]>;
    createUser: jest.Mock<Observable<User>, [User]>;
    updateUser: jest.Mock<Observable<User>, [string, Partial<User>]>;
    loadUsers: jest.Mock<Observable<User[]>, []>;
    softDeleteUser: jest.Mock<Observable<void>, [string]>;
    updateUserRoles: jest.Mock<Observable<void>, [string, UserRoleType[]]>;
  };

  let formatterSpy: {
    formatFullName: jest.Mock<string, [User]>;
    getUserFullName: jest.Mock<string, [string | undefined]>;
    getAuthorsNames: jest.Mock<string, [(string | User)[] | undefined]>;
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUser = createMockUser();
    mockCurrentUserSignal = signal<User | null>(null);
    storageSpy = {
      currentUser: mockCurrentUserSignal,
      users: signal([mockUser]),
      students: signal([]),
      teachers: signal([mockUser]),
      advisors: signal([]),
      potentialDirectors: signal([mockUser]),
      setCurrentUser: jest.fn(),
      getUsersSnapshot: jest.fn().mockReturnValue([mockUser]),
      updateUsersList: jest.fn()
    };
    isAuthenticated = signal(false);

    apiSpy = {
      getUserById: jest.fn().mockReturnValue(of(mockUser)),
      getUsersByRole: jest.fn().mockReturnValue(of([mockUser])),
      createUser: jest.fn().mockReturnValue(of(mockUser)),
      updateUser: jest.fn().mockReturnValue(of(mockUser)),
      loadUsers: jest.fn().mockReturnValue(of([mockUser])),
      softDeleteUser: jest.fn().mockReturnValue(of(void 0)),
      updateUserRoles: jest.fn().mockReturnValue(of(void 0))
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
        { provide: UserFormatterService, useValue: formatterSpy },
        { provide: AuthStorageService, useValue: { isAuthenticated } }
      ]
    });

    service = TestBed.inject(UserService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Carga de la lista desde el backend', () => {
    it('sin sesión no carga usuarios ni vacía la lista', () => {
      TestBed.tick();
      expect(apiSpy.loadUsers).not.toHaveBeenCalled();
      expect(storageSpy.updateUsersList).not.toHaveBeenCalled();
    });

    it('carga la lista al iniciar sesión y la vacía al cerrarla', () => {
      TestBed.tick();
      isAuthenticated.set(true);
      TestBed.tick();
      expect(apiSpy.loadUsers).toHaveBeenCalledTimes(1);

      isAuthenticated.set(false);
      TestBed.tick();
      expect(storageSpy.updateUsersList).toHaveBeenCalledTimes(1);
      const vaciar = storageSpy.updateUsersList.mock.calls[0][0];
      expect(vaciar([mockUser])).toEqual([]);
    });

    it('loadUsers() vuelve a pedir la lista al API', () => {
      service.loadUsers();
      expect(apiSpy.loadUsers).toHaveBeenCalled();
    });
  });

  it('debería inicializarse correctamente', () => {
    expect(service).toBeTruthy();
  });

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

  describe('Delegación de Consultas y Mutaciones', () => {
    it('getAllUsers() y getUsersSnapshot() deberían llamar al snapshot del storage', () => {
      expect(service.getAllUsers()).toEqual([mockUser]);
      expect(service.getUsersSnapshot()).toEqual([mockUser]);
      expect(storageSpy.getUsersSnapshot).toHaveBeenCalledTimes(2);
    });

    it('getUserById() debería delegar al API Service', () => {
      service.getUserById('111').subscribe();
      expect(apiSpy.getUserById).toHaveBeenCalledWith('111');
    });

    it('getUsersByRole() debería delegar al API Service', () => {
      service.getUsersByRole(UserRoleType.DOCENTE).subscribe();
      expect(apiSpy.getUsersByRole).toHaveBeenCalledWith(UserRoleType.DOCENTE);
    });

    it('createUser() debería delegar la creación al API Service', () => {
      service.createUser(mockUser).subscribe();
      expect(apiSpy.createUser).toHaveBeenCalledWith(mockUser);
    });

    it('updateUser() debería delegar al API Service', () => {
      const changes = { firstName: 'Carlos' };
      service.updateUser('111', changes).subscribe();
      expect(apiSpy.updateUser).toHaveBeenCalledWith('111', changes);
    });

    it('softDeleteUser() debería delegar la eliminación lógica al API Service', () => {
      service.softDeleteUser('123').subscribe();
      expect(apiSpy.softDeleteUser).toHaveBeenCalledWith('123');
    });

    it('updateUserRoles() debería delegar al API Service', () => {
      service.updateUserRoles('111', [UserRoleType.ADMINISTRADOR]).subscribe();
      expect(apiSpy.updateUserRoles).toHaveBeenCalledWith('111', [UserRoleType.ADMINISTRADOR]);
    });

  });

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
