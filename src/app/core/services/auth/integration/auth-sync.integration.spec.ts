import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, NavigationExtras } from '@angular/router';
import { AuthApiService } from '../auth-api.service';
import { AuthStorageService } from '../auth-storage.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { UserStorageService } from '../../../../modules/users/services/user-storage.service';
import { UserApiService } from '../../../../modules/users/services/user-api.service';
import { User } from '../../../../modules/users/interfaces/user.interface';
import { UserState } from '../../../../modules/users/enum/user-state.enum';
import { IdentificationType } from '../../../../modules/users/enum/identification-type.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-auth-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 202601,
  email: 'juan@test.com',
  password: 'oldPassword123',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

describe('Integración [Auth]: Sincronización Cruzada de Identidad (Core ➔ Users)', () => {
  let authApi: AuthApiService;
  let authStorage: AuthStorageService;
  let userService: UserService;
  let userStorage: UserStorageService;
  let routerMock: { navigate: jest.Mock<Promise<boolean>, [string[], NavigationExtras?]> };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    routerMock = { navigate: jest.fn().mockResolvedValue(true) };

    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        AuthStorageService,
        UserService,
        UserStorageService,
        UserApiService,
        { provide: Router, useValue: routerMock }
      ]
    });

    authApi = TestBed.inject(AuthApiService);
    authStorage = TestBed.inject(AuthStorageService);
    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);
    localStorage.clear();
    const testUser = createMockUser();
    userStorage.updateUsersList(() => [testUser]);
  });

  it('debe mantener sincronizada la lista global de usuarios y la sesión al cambiar la contraseña', fakeAsync(() => {
    let loginSuccess = false;
    authApi.login({ email: 'juan@test.com', password: 'oldPassword123' }).subscribe(response => {
      loginSuccess = response.success;
    });
    tick(1000);
    expect(loginSuccess).toBe(true);
    expect(authStorage.isAuthenticated()).toBe(true);
    let changeResponse: { success: boolean; message?: string } | undefined;
    authApi.changePassword('oldPassword123', 'newPassword456').subscribe(response => {
      changeResponse = response;
    });
    tick(2100);
    expect(changeResponse?.success).toBe(true);
    const activeSession = authStorage.currentUser();
    expect(activeSession?.password).toBe('newPassword456');
    const globalUser = userService.getUsersSnapshot().find(u => u.id === 'user-auth-1');
    expect(globalUser?.password).toBe('newPassword456');
    authApi.logout();
    let secondLoginSuccess = false;
    authApi.login({ email: 'juan@test.com', password: 'newPassword456' }).subscribe(response => {
      secondLoginSuccess = response.success;
    });
    tick(1000);
    expect(secondLoginSuccess).toBe(true);
  }));

  it('debe rebotar el cambio de contraseña si la contraseña actual no coincide, sin mutar nada', fakeAsync(() => {
    authApi.login({ email: 'juan@test.com', password: 'oldPassword123' }).subscribe();
    tick(1000);
    let errorCaught = false;
    authApi.changePassword('wrongPassword', 'newPassword456').subscribe({
      error: () => errorCaught = true
    });
    tick(1500);
    expect(errorCaught).toBe(true);
    const globalUser = userService.getUsersSnapshot().find(user => user.id === 'user-auth-1');
    expect(globalUser?.password).toBe('oldPassword123');
  }));
});
