// src/app/modules/users/integration/user-creation.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

// FIX: Polyfill preventivo para fake-indexeddb en entornos Node/Jest antiguos (Global)
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

describe('Integración [Users]: Registro de un nuevo usuario', () => {
  let userService: UserService;
  let userStorage: UserStorageService;

  // 1. ESCUDO GLOBAL: Atrapa warnings de promesas huérfanas en toda la suite
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  // 3. Restauración definitiva al acabar el archivo
  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    // 2. Limpieza atómica entre tests
    jest.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [UserService, UserStorageService, UserApiService, UserFormatterService]
    });

    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);
    userStorage.updateUsersList(() => []);
  });

  it('debe generar un id nuevo, activar por defecto al usuario y persistirlo en el storage', fakeAsync(() => {
    // FIX: Uso seguro de Partial para armar el payload de ingreso sin errores de compilación
    const newUserPayloadPartial: Partial<User> = {
      id: 'temp-discarded', idType: IdentificationType.CC, idNumber: 987654321,
      firstName: 'Nuevo', secondName: '', lastName: 'Usuario', secondLastName: '',
      codeNumber: 202699, email: 'nuevo@test.com', password: 'temporal123',
      state: UserState.inactive, roles: [UserRoleType.ESTUDIANTE]
    };
    const newUserPayload = newUserPayloadPartial as User;

    let created: User | undefined;

    userService.createUserMock(newUserPayload).subscribe({
      next: result => { created = result; },
      // FIX: Forzamos el fallo de Jest si la suscripción arroja un error asíncrono
      error: err => { fail('La suscripción falló inesperadamente: ' + JSON.stringify(err)); }
    });

    tick(1000);

    // El estado del payload (inactive) se ignora — createUser fuerza active.
    expect(created?.id).toBeTruthy();
    expect(created?.id).not.toBe('temp-discarded');
    expect(created?.state).toBe(UserState.active);

    const stored = userStorage.getUsersSnapshot().find(u => u.id === created?.id);
    expect(stored?.email).toBe('nuevo@test.com');
  }));

  it('no debe alterar a los usuarios ya existentes al registrar uno nuevo', fakeAsync(() => {
    // FIX: Uso de la fábrica para evitar escribir una interfaz cruda gigantesca manualmente
    const existing = createMockUser({
      id: 'existing-1', idNumber: 111,
      firstName: 'Existente', lastName: 'Previo',
      codeNumber: 1, email: 'existente@test.com'
    });

    userStorage.updateUsersList(() => [existing]);

    const secondPayloadPartial: Partial<User> = { ...existing, id: 'temp-discarded', email: 'segundo@test.com' };
    const secondPayload = secondPayloadPartial as User;

    userService.createUserMock(secondPayload).subscribe({
      error: err => { fail('La suscripción falló inesperadamente: ' + JSON.stringify(err)); }
    });

    tick(1000);

    expect(userStorage.getUsersSnapshot()).toHaveLength(2);
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'existing-1')?.email).toBe('existente@test.com');
  }));
});
