import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';

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

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Users]: Reactividad de la Tabla de Usuarios', () => {
  let facade: UsersFacadeService;
  let storage: UserStorageService;
  let appRef: ApplicationRef;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

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

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
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
    facade.toggleUserStatus('target-user', false, () => {
      successCallbackCalled = true;
    });

    // Simulamos el paso del tiempo por el delay(800) de UserApiService
    tick(800);
    appRef.tick(); // Forzamos la reactividad de los Signals

    // Assert: El callback del componente debió llamarse (para cerrar el modal)
    expect(successCallbackCalled).toBe(true);

    // Assert Crítico: El computed() debió reaccionar automáticamente al cambio en el Storage,
    // pasando por el MapperService, y reflejarse en el Facade.
    tableRows = facade.usersTableData();
    expect(tableRows[0].estado).toBe('Inactivo');

    // El mapper debió cambiar los botones permitidos
    expect(tableRows[0].allowedActions).toContain('activar');
    expect(tableRows[0].allowedActions).not.toContain('eliminar');
  }));
});
