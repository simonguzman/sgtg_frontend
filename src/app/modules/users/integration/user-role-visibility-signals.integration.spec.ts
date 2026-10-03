// src/app/modules/users/integration/user-role-visibility-signals.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

// FIX: Polyfill para fake-indexeddb en entornos Node/Jest antiguos (Global)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
import { UserFormatterService } from '../services/user-formatter.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// ── Fábrica Estricta (Zero 'any', Zero 'unknown') ────────────────────────────
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Users]: students()/teachers()/advisors() reaccionan a mutaciones reales de rol', () => {
  let userService: UserService;
  let userStorage: UserStorageService;

  // 1. ESCUDO GLOBAL: Atrapa errores asíncronos tardíos de IndexedDB en toda la suite
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // 3. Restauración definitiva al acabar el archivo
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // 2. Limpieza entre tests (mantiene el escudo activo, pero reinicia contadores)
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        UserService,
        UserStorageService,
        UserApiService,
        UserFormatterService
      ]
    });

    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);

    // Vaciamos la lista de usuarios y el storage para empezar en un lienzo en blanco
    userStorage.updateUsersList(() => []);
    localStorage.clear();
  });

  it('un docente debe aparecer en advisors() en cuanto se le otorga ASESOR — impacta directamente los <select> de Propuesta/Anteproyecto', fakeAsync(() => {
    const teacher = createMockUser({ id: 'teacher-vis-1', roles: [UserRoleType.DOCENTE] });
    userStorage.updateUsersList(() => [teacher]);

    // Act: Validamos que al inicio NO está en la lista de asesores
    expect(userStorage.advisors().some(u => u.id === 'teacher-vis-1')).toBe(false);

    userService.addRoleToUser('teacher-vis-1', UserRoleType.ASESOR).subscribe();

    // tick() procesa la suscripción asíncrona simulada
    tick(500);

    // Assert: Verificamos reactividad
    expect(userStorage.advisors().some(u => u.id === 'teacher-vis-1')).toBe(true);
    expect(userStorage.teachers().some(u => u.id === 'teacher-vis-1')).toBe(true); // conserva DOCENTE
  }));

  it('un estudiante debe desaparecer de students() si su rol ESTUDIANTE es retirado', fakeAsync(() => {
    const student = createMockUser({ id: 'student-vis-1', roles: [UserRoleType.ESTUDIANTE] });
    userStorage.updateUsersList(() => [student]);

    expect(userStorage.students().some(u => u.id === 'student-vis-1')).toBe(true);

    userService.removeRoleFromUser('student-vis-1', UserRoleType.ESTUDIANTE).subscribe();
    tick(500);

    expect(userStorage.students().some(u => u.id === 'student-vis-1')).toBe(false);
  }));

  it('potentialDirectors() no debe verse afectado por otorgar EVALUADOR — DOCENTE se conserva intacto', fakeAsync(() => {
    const teacher = createMockUser({ id: 'teacher-vis-2', roles: [UserRoleType.DOCENTE] });
    userStorage.updateUsersList(() => [teacher]);

    userService.addRoleToUser('teacher-vis-2', UserRoleType.EVALUADOR).subscribe();
    tick(500);

    expect(userStorage.potentialDirectors().some(u => u.id === 'teacher-vis-2')).toBe(true);
  }));
});
