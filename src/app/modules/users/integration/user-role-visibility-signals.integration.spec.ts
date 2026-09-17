// src/app/modules/users/integration/user-role-visibility-signals.integration.spec.ts
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
import { UserFormatterService } from '../services/user-formatter.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Users]: students()/teachers()/advisors() reaccionan a mutaciones reales de rol', () => {
  let userService: UserService;
  let userStorage: UserStorageService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [UserService, UserStorageService, UserApiService, UserFormatterService]
    });
    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);
    userStorage.updateUsersList(() => []);
  });

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('un docente debe aparecer en advisors() en cuanto se le otorga ASESOR — impacta directamente los <select> de Propuesta/Anteproyecto', fakeAsync(() => {
    const teacher = createMockUser({ id: 'teacher-vis-1', roles: [UserRoleType.DOCENTE] });
    userStorage.updateUsersList(() => [teacher]);
    expect(userStorage.advisors().some(u => u.id === 'teacher-vis-1')).toBe(false);

    userService.addRoleToUser('teacher-vis-1', UserRoleType.ASESOR).subscribe();
    tick(500);

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
