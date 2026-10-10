import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'default-id',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Default',
  secondName: '',
  lastName: 'User',
  secondLastName: '',
  email: 'default@test.com',
  password: '123',
  codeNumber: 1,
  state: UserState.active,
  roles: [UserRoleType.ESTUDIANTE],
  ...overrides
});

describe('UserStorageService', () => {
  let service: UserStorageService;
  let localStorageStore: Record<string, string>;
  const mockStudent = createMockUser({
    id: '11111111-1111-1111-1111-111111111111',
    idNumber: 111,
    firstName: 'Estudiante',
    lastName: 'Test',
    email: 'student@test.com',
    codeNumber: 1,
    roles: [UserRoleType.ESTUDIANTE]
  });

  const mockTeacher = createMockUser({
    id: '22222222-2222-2222-2222-222222222222',
    idNumber: 222,
    firstName: 'Docente',
    lastName: 'Test',
    email: 'teacher@test.com',
    codeNumber: 2,
    roles: [UserRoleType.DOCENTE]
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorageStore = {};
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => localStorageStore[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { localStorageStore[key] = value; });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => { delete localStorageStore[key]; });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y LocalStorage', () => {
    it('debería iniciar sin usuarios (vienen del backend) y tomar la sesión del login (AuthStorageService)', () => {
      localStorageStore['sgtg_token'] = crearJwtDePrueba();
      localStorageStore['sgtg_session'] = JSON.stringify(mockTeacher);
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
      expect(service.getUsersSnapshot()).toEqual([]);
      expect(service.currentUser()).toEqual(mockTeacher);
    });

    it('debería eliminar los datos simulados del formato anterior', () => {
      localStorageStore['sgtg_users'] = JSON.stringify([mockStudent]);
      localStorageStore['sgtg_current_session'] = JSON.stringify(mockTeacher);
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
      expect(localStorageStore['sgtg_users']).toBeUndefined();
      expect(localStorageStore['sgtg_current_session']).toBeUndefined();
      expect(service.getUsersSnapshot()).toEqual([]);
      expect(service.currentUser()).toBeNull();
    });
  });

  describe('Señales Computadas para Roles', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
      service.updateUsersList(() => [mockStudent, mockTeacher]);
    });

    it('debería segmentar correctamente al arreglo de estudiantes', () => {
      expect(service.students()).toEqual([mockStudent]);
    });

    it('debería segmentar correctamente a los docentes y posibles directores', () => {
      expect(service.teachers()).toEqual([mockTeacher]);
      expect(service.potentialDirectors()).toEqual([mockTeacher]);
    });

    it('debería segmentar correctamente al arreglo de asesores', () => {
      const mockAdvisor = createMockUser({ roles: [UserRoleType.ASESOR] });
      service.updateUsersList((current) => [...current, mockAdvisor]);
      expect(service.advisors()).toEqual([mockAdvisor]);
    });
  });

  describe('Mutaciones de Estado y Efectos', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
    });

    it('updateUsersList() debería mutar la señal sin guardar la lista en LocalStorage', () => {
      service.updateUsersList(() => [mockTeacher]);
      expect(service.getUsersSnapshot()).toEqual([mockTeacher]);
      expect(Storage.prototype.setItem).not.toHaveBeenCalledWith('sgtg_users', expect.anything());
    });

    it('updateCurrentUser() debería actualizar el usuario de la sesión única', () => {
      service.updateCurrentUser(() => mockTeacher);
      expect(service.currentUser()).toEqual(mockTeacher);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('sgtg_session', JSON.stringify(mockTeacher));
    });

    it('setCurrentUser() debería actualizar la sesión única y con null cerrarla', () => {
      service.setCurrentUser(mockStudent);
      expect(service.currentUser()).toEqual(mockStudent);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('sgtg_session', JSON.stringify(mockStudent));
      service.setCurrentUser(null);
      expect(service.currentUser()).toBeNull();
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('sgtg_session');
    });
  });

  describe('Consultas Asíncronas (RxJS)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
      service.updateUsersList(() => [mockStudent]);
    });

    it('getById() debería buscar al usuario y emitirlo tras un delay de 500ms', fakeAsync(() => {
      let result: User | undefined;
      service.getById('11111111-1111-1111-1111-111111111111').subscribe(res => result = res);
      expect(result).toBeUndefined();
      tick(500);
      expect(result).toEqual(mockStudent);
    }));
  });
});
