import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

import { UserService } from './user.service';
import { UserStorageService } from './user-storage.service';
import { UserApiService } from './user-api.service';
import { UserFormatterService } from './user-formatter.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

describe('UserService', () => {
  let service: UserService;

  // Reemplazamos 'any' por el tipo estricto de cada servicio
  let storageSpy: jest.Mocked<UserStorageService>;
  let apiSpy: jest.Mocked<UserApiService>;
  let formatterSpy: jest.Mocked<UserFormatterService>;

  // Señal controlable para simular el estado reactivo del usuario actual
  let mockCurrentUserSignal: WritableSignal<User | null>;

  const mockUser: User = {
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
    roles: [UserRoleType.DOCENTE]
  };

  beforeEach(() => {
    // Inicializamos la señal en null (sin sesión)
    mockCurrentUserSignal = signal<User | null>(null);

    // Mock del Storage Service estrictamente tipado
    storageSpy = {
      currentUser: mockCurrentUserSignal,
      users: signal([mockUser]),
      students: signal([]),
      teachers: signal([mockUser]),
      advisors: signal([]),
      potentialDirectors: signal([mockUser]),
      setCurrentUser: jest.fn(),
      getUsersSnapshot: jest.fn().mockReturnValue([mockUser]),
    } as unknown as jest.Mocked<UserStorageService>;

    // Mock del API Service estrictamente tipado
    apiSpy = {
      getUserById: jest.fn().mockReturnValue(of(mockUser)),
      createUser: jest.fn().mockReturnValue(of(mockUser)),
      softDeleteUser: jest.fn().mockReturnValue(of(void 0))
    } as unknown as jest.Mocked<UserApiService>;

    // Mock del Formatter Service estrictamente tipado
    formatterSpy = {
      formatFullName: jest.fn().mockReturnValue('Juan Pérez'),
      getUserFullName: jest.fn().mockReturnValue('Juan Pérez'),
      getAuthorsNames: jest.fn().mockReturnValue('Juan Pérez')
    } as unknown as jest.Mocked<UserFormatterService>;

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
    it('getAllUsers() debería llamar al snapshot del storage', () => {
      const result = service.getAllUsers();
      expect(storageSpy.getUsersSnapshot).toHaveBeenCalled();
      expect(result).toEqual([mockUser]);
    });

    it('getUserByIdMock() debería delegar la petición al API Service', () => {
      service.getUserByIdMock('11111111-1111-1111-1111-111111111111').subscribe();
      expect(apiSpy.getUserById).toHaveBeenCalledWith('11111111-1111-1111-1111-111111111111');
    });

    it('createUserMock() debería delegar la creación al API Service', () => {
      service.createUserMock(mockUser).subscribe();
      expect(apiSpy.createUser).toHaveBeenCalledWith(mockUser);
    });

    it('softDeleteUserMock() debería delegar la eliminación lógica al API Service', () => {
      service.softDeleteUserMock('123').subscribe();
      expect(apiSpy.softDeleteUser).toHaveBeenCalledWith('123');
    });
  });

  // ==========================================
  // DELEGACIÓN: FORMATO
  // ==========================================
  describe('Delegación de Formateo de Texto', () => {
    it('formatFullName() debería delegar la acción al Formatter Service', () => {
      service.formatFullName(mockUser);
      expect(formatterSpy.formatFullName).toHaveBeenCalledWith(mockUser);
    });

    it('getAuthorsNames() debería delegar la acción al Formatter Service', () => {
      service.getAuthorsNames([mockUser, 'uuid-123']);
      expect(formatterSpy.getAuthorsNames).toHaveBeenCalledWith([mockUser, 'uuid-123']);
    });
  });
});
