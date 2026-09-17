import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

// Servicios Reales (Costura transversal Core <-> Users)
import { AuthApiService } from '../auth-api.service';
import { AuthStorageService } from '../auth-storage.service';
import { UserService } from '../../../../modules/users/services/user.service';
import { UserStorageService } from '../../../../modules/users/services/user-storage.service';
import { UserApiService } from '../../../../modules/users/services/user-api.service';

// Modelos
import { User } from '../../../../modules/users/interfaces/user.interface';
import { UserState } from '../../../../modules/users/enum/user-state.enum';
import { IdentificationType } from '../../../../modules/users/enum/identification-type.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-auth-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 202601,
  email: 'juan@test.com',
  password: 'oldPassword123',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Auth]: Sincronización Cruzada de Identidad (Core ➔ Users)', () => {
  let authApi: AuthApiService;
  let authStorage: AuthStorageService;
  let userService: UserService;
  let userStorage: UserStorageService;
  let routerMock: { navigate: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    routerMock = { navigate: jest.fn() };

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

    // Arrange: Limpiamos los storages y sembramos un usuario maestro
    localStorage.clear();
    const testUser = createMockUser();
    userStorage.updateUsersList(() => [testUser]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe mantener sincronizada la lista global de usuarios y la sesión al cambiar la contraseña', fakeAsync(() => {
    // 1. Iniciamos sesión para que AuthStorage reconozca al usuario
    let loginSuccess = false;
    authApi.login({ email: 'juan@test.com', password: 'oldPassword123' }).subscribe(res => {
      loginSuccess = res.success;
    });

    // delay(1000) en el método login
    tick(1000);
    expect(loginSuccess).toBe(true);
    expect(authStorage.isAuthenticated()).toBe(true);

    // 2. ACT: El usuario cambia su contraseña
    let changeResponse: { success: boolean; message: string } | undefined;
    authApi.changePassword('oldPassword123', 'newPassword456').subscribe(res => {
      changeResponse = res;
    });

    // delay(1500) en el método changePassword y delay(600) en updateUserPasswordMock
    tick(2100);

    // 3. ASSERT A: La respuesta al componente fue exitosa
    expect(changeResponse?.success).toBe(true);

    // 4. ASSERT B: La sesión actual (AuthStorage) reflejó el cambio
    const activeSession = authStorage.currentUser();
    expect(activeSession?.password).toBe('newPassword456');

    // 5. ASSERT C (El más crítico): El maestro de Usuarios (UserStorage) también se actualizó.
    // Si esto falla, el próximo login será rechazado.
    const globalUser = userService.getUsersSnapshot().find(u => u.id === 'user-auth-1');
    expect(globalUser?.password).toBe('newPassword456');

    // 6. ASSERT D: Demostrar que un nuevo intento de login funciona con la NUEVA contraseña
    authApi.logout();

    let secondLoginSuccess = false;
    authApi.login({ email: 'juan@test.com', password: 'newPassword456' }).subscribe(res => {
      secondLoginSuccess = res.success;
    });
    tick(1000);

    expect(secondLoginSuccess).toBe(true);
  }));

  it('debe rebotar el cambio de contraseña si la contraseña actual no coincide, sin mutar nada', fakeAsync(() => {
    // 1. Iniciamos sesión
    authApi.login({ email: 'juan@test.com', password: 'oldPassword123' }).subscribe();
    tick(1000);

    // 2. ACT: Intento de cambio con contraseña antigua incorrecta
    let errorCaught = false;
    authApi.changePassword('wrongPassword', 'newPassword456').subscribe({
      error: () => errorCaught = true
    });

    tick(1500);

    // 3. ASSERT: Validamos que el error fue arrojado
    expect(errorCaught).toBe(true);

    // 4. ASSERT: Validamos que la base de datos global NO fue alterada
    const globalUser = userService.getUsersSnapshot().find(u => u.id === 'user-auth-1');
    expect(globalUser?.password).toBe('oldPassword123'); // Conserva la original
  }));
});
