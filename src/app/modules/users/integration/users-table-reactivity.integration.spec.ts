// src/app/modules/users/integration/users-table-reactivity.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';

// FIX: Polyfill preventivo para fake-indexeddb en entornos Node/Jest antiguos (Global)
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

// Servicios reales involucrados en la costura
import { UsersFacadeService } from '../pages/users-page/services/users-facade.service';
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
import { UsersMapperService } from '../pages/users-page/services/users-mapper.service';
import { UserFormatterService } from '../services/user-formatter.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

// Modelos
import { User } from '../interfaces/user.interface';
import { UserState } from '../enum/user-state.enum';
import { IdentificationType } from '../enum/identification-type.enum';

// ── Fábrica Estricta (Zero 'any', Zero 'unknown') ────────────────────────────
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '', // Asegurando compatibilidad completa
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

describe('Integración [Users]: Reactividad de la Tabla de Usuarios', () => {
  let facade: UsersFacadeService;
  let storage: UserStorageService;
  let appRef: ApplicationRef;

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
      providers: [
        // La cadena completa es real, no mockeamos ni el mapper ni la API local
        UsersFacadeService,
        UserService,
        UserStorageService,
        UserApiService,
        UsersMapperService,
        UserFormatterService,
        // Solo mockeamos el servicio visual de notificaciones que no afecta el estado
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    facade = TestBed.inject(UsersFacadeService);
    storage = TestBed.inject(UserStorageService);
    appRef = TestBed.inject(ApplicationRef);

    // Sembramos un usuario inicial activo
    storage.updateUsersList(() => [createMockUser({ id: 'target-user', state: UserState.active })]);
  });

  it('debe actualizar la tabla y re-calcular las acciones permitidas al deshabilitar un usuario (Soft Delete)', fakeAsync(() => {
    // Arrange: Validamos el estado inicial en el computed() del Facade
    let tableRows = facade.usersTableData();
    expect(tableRows).toHaveLength(1);
    expect(tableRows[0].estado).toBe('Activo');
    expect(tableRows[0].allowedActions).toContain('eliminar'); // Un usuario activo puede ser eliminado (deshabilitado)
    expect(tableRows[0].allowedActions).not.toContain('activar');

    // Act: Disparamos la acción desde el Facade simulando el click del componente
    let successCallbackCalled = false;

    // Si tu facade tiene un callback de error, lo ideal es pasarle () => { fail(...) }
    // Asumiendo la firma: (id, status, onSuccess)
    facade.toggleUserStatus('target-user', false, () => {
      successCallbackCalled = true;
    });

    // Simulamos el paso del tiempo por el delay(800) de UserApiService
    tick(800);
    appRef.tick(); // Forzamos la reactividad de los Signals para que se recalculen los computed()

    // Assert: El callback del componente debió llamarse (para cerrar el modal/spinner)
    expect(successCallbackCalled).toBe(true);

    // Assert Crítico: El computed() debió reaccionar automáticamente al cambio en el Storage,
    // pasando por el MapperService, y reflejarse en el Facade.
    tableRows = facade.usersTableData();
    expect(tableRows[0].estado).toBe('Inactivo');

    // El mapper debió recalcular y cambiar los botones permitidos basándose en el nuevo estado
    expect(tableRows[0].allowedActions).toContain('activar');
    expect(tableRows[0].allowedActions).not.toContain('eliminar');
  }));
});
