import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('UserStorageService', () => {
  let service: UserStorageService;
  let localStorageStore: Record<string, string>;

  // Usuarios simulados construidos con la fábrica
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
    // 🔕 Silenciar consola para mantener terminal limpia ante errores intencionales de parseo
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Limpiamos y preparamos el mock de LocalStorage antes de inyectar el servicio
    localStorageStore = {};

    // Espiar Storage.prototype asegurando firmas estrictas
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => localStorageStore[key] || null);
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => { localStorageStore[key] = value; });
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => { delete localStorageStore[key]; });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Fundamental para limpiar Storage.prototype y console
  });

  // ==========================================
  // INICIALIZACIÓN Y PERSISTENCIA (LocalStorage)
  // ==========================================
  describe('Inicialización y LocalStorage', () => {
    it('debería cargar los datos desde LocalStorage si el JSON almacenado es válido', () => {
      // Pre-poblamos el storage simulado
      localStorageStore['sgtg_users'] = JSON.stringify([mockStudent]);
      localStorageStore['sgtg_current_session'] = JSON.stringify(mockTeacher);

      // Inyectamos el servicio DESPUÉS de poblar el mock
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);

      expect(service.getUsersSnapshot()).toEqual([mockStudent]);
      expect(service.currentUser()).toEqual(mockTeacher);
    });

    it('debería manejar errores de JSON inválido, limpiar la llave y cargar usuarios iniciales', () => {
      // Simulamos basura en el LocalStorage
      localStorageStore['sgtg_users'] = '{ json_corrupto_sin_comillas }';
      localStorageStore['sgtg_current_session'] = 'undefined';

      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);

      // Verificamos el bloque catch validando el método mockeado desde el prototype
      expect(Storage.prototype.removeItem).toHaveBeenCalledWith('sgtg_users');
      expect(service.getUsersSnapshot().length).toBeGreaterThan(0); // Carga USER_LIST por defecto
      expect(service.currentUser()).toBeNull();
    });
  });

  // ==========================================
  // SEÑALES COMPUTADAS (Computed Signals)
  // ==========================================
  describe('Señales Computadas para Roles', () => {
    beforeEach(() => {
      localStorageStore['sgtg_users'] = JSON.stringify([mockStudent, mockTeacher]);
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
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

  // ==========================================
  // MUTACIONES Y EFECTOS (Signals & Effects)
  // ==========================================
  describe('Mutaciones de Estado y Efectos', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
    });

    it('updateUsersList() debería mutar la señal y disparar el effect hacia LocalStorage', () => {
      service.updateUsersList(() => [mockTeacher]);

      // Forzamos al framework a ejecutar los effect() pendientes
      TestBed.flushEffects();

      expect(service.getUsersSnapshot()).toEqual([mockTeacher]);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('sgtg_users', JSON.stringify([mockTeacher]));
    });

    it('updateCurrentUser() debería mutar al usuario actual y disparar el effect', () => {
      service.updateCurrentUser(() => mockTeacher);

      TestBed.flushEffects();

      expect(service.currentUser()).toEqual(mockTeacher);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('sgtg_current_session', JSON.stringify(mockTeacher));
    });

    it('setCurrentUser() debería actualizar la sesión y disparar el effect hacia LocalStorage', () => {
      service.setCurrentUser(mockStudent);

      TestBed.flushEffects();

      expect(service.currentUser()).toEqual(mockStudent);
      expect(Storage.prototype.setItem).toHaveBeenCalledWith('sgtg_current_session', JSON.stringify(mockStudent));
    });
  });

  // ==========================================
  // BÚSQUEDA ASÍNCRONA (RxJS)
  // ==========================================
  describe('Consultas Asíncronas (RxJS)', () => {
    beforeEach(() => {
      localStorageStore['sgtg_users'] = JSON.stringify([mockStudent]);
      TestBed.configureTestingModule({ providers: [UserStorageService] });
      service = TestBed.inject(UserStorageService);
    });

    it('getById() debería buscar al usuario y emitirlo tras un delay de 500ms', fakeAsync(() => {
      let result: User | undefined;

      service.getById('11111111-1111-1111-1111-111111111111').subscribe(res => result = res);

      expect(result).toBeUndefined(); // Aún en espera de la red simulada
      tick(500); // Avanzamos el reloj virtual
      expect(result).toEqual(mockStudent); // Suscripción resuelta
    }));
  });
});
