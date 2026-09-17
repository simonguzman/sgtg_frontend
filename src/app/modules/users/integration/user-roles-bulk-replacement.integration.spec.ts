// src/app/modules/users/integration/user-roles-bulk-replacement.integration.spec.ts
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

describe('Integración [Users]: Reemplazo masivo de roles (updateUserRolesMock)', () => {
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
  });

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('debe REEMPLAZAR por completo el arreglo de roles, no acumularlo', fakeAsync(() => {
    const target = createMockUser({ id: 'target-1', roles: [UserRoleType.ESTUDIANTE, UserRoleType.EVALUADOR] });
    userStorage.updateUsersList(() => [target]);

    userService.updateUserRolesMock('target-1', [UserRoleType.DOCENTE]).subscribe();
    tick(500);

    const updated = userStorage.getUsersSnapshot().find(u => u.id === 'target-1');
    expect(updated?.roles).toEqual([UserRoleType.DOCENTE]);
    expect(updated?.roles).not.toContain(UserRoleType.ESTUDIANTE);
  }));

  it('⚠️ documenta que NO sincroniza currentUser — a diferencia de removeRolesFromUsersMock', fakeAsync(() => {
    const selfUser = createMockUser({ id: 'self-1', roles: [UserRoleType.DOCENTE] });
    userStorage.updateUsersList(() => [selfUser]);
    userStorage.setCurrentUser(selfUser);

    userService.updateUserRolesMock('self-1', [UserRoleType.DOCENTE, UserRoleType.ADMINISTRADOR]).subscribe();
    tick(500);

    // El registro global sí cambió...
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'self-1')?.roles).toContain(UserRoleType.ADMINISTRADOR);
    // ...pero la sesión activa queda congelada con los roles viejos. Si
    // esto se usa alguna vez sobre el propio usuario logueado, su UI
    // basada en roles no reflejaría el cambio hasta el próximo login.
    expect(userStorage.currentUser()?.roles).not.toContain(UserRoleType.ADMINISTRADOR);
  }));
});
