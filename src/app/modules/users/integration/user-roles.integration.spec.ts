import 'fake-indexeddb/auto'; // Polyfill para la hidratación real
import { TestBed, fakeAsync, tick } from '@angular/core/testing';

// Servicios Reales (La integración completa)
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
import { UserFormatterService } from '../services/user-formatter.service';

// Interfaces y Enums
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// ── Fábricas Estrictas (Cero 'any') ──────────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [], // Inicia sin roles
  ...overrides
});

// ── Inicio de la Suite de Integración ───────────────────────────────────────

describe('Integración [Users]: Asignación y Remoción de Roles (Flujo End-to-End)', () => {
  let userService: UserService;
  let userStorage: UserStorageService;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    // 1. Silenciador de consola con vigilancia
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        // ¡TODOS LOS SERVICIOS SON REALES! No hay mocks.
        UserService,
        UserStorageService,
        UserApiService,
        UserFormatterService
      ]
    });

    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);

    // 2. Sembrar el Storage con un estado limpio, sobreescribiendo el USER_LIST por defecto
    userStorage.updateUsersList(() => [
      createMockUser({ id: 'user-123', roles: ['ESTUDIANTE' as UserRoleType] })
    ]);
  });

  afterEach(() => {
    // Garantizamos que no hubo fallos silenciosos (ej. IndexedDB reventando)
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  // =======================================================================
  // 🐛 PRUEBA CAZADORA DE BUGS: LA SUSCRIPCIÓN OLVIDADA
  // =======================================================================
  it('NO debe actualizar el storage si se llama al servicio pero se olvida el .subscribe()', fakeAsync(() => {
    // Act: Llamamos al servicio, pero como devuelve un Observable Frío,
    // si el componente que lo llama no hace .subscribe(), la cadena no arranca.
    userService.addRoleToUser('user-123', 'DIRECTOR' as UserRoleType);

    // Avanzamos el tiempo simulado por si acaso
    tick(500);

    // Assert: El usuario NO debió recibir el rol, porque el 'tap()' en el API nunca se ejecutó
    const user = userStorage.getUsersSnapshot().find(u => u.id === 'user-123');
    expect(user?.roles).not.toContain('DIRECTOR');
  }));

  // =======================================================================
  // ✅ FLUJOS CORRECTOS
  // =======================================================================
  it('debe actualizar el Signal del Storage al agregar un rol cuando SÍ hay .subscribe()', fakeAsync(() => {
    // Act
    userService.addRoleToUser('user-123', 'DIRECTOR' as UserRoleType).subscribe();

    // El observable en UserApiService tiene un delay(500).
    // Usamos tick(500) para saltar en el tiempo sin esperar medio segundo real.
    tick(500);

    // Assert: Verificamos la mutación en el Storage
    const updatedUser = userStorage.getUsersSnapshot().find(u => u.id === 'user-123');

    expect(updatedUser).toBeDefined();
    expect(updatedUser?.roles).toContain('ESTUDIANTE'); // Conserva el que tenía
    expect(updatedUser?.roles).toContain('DIRECTOR');   // Añade el nuevo
  }));

  it('debe actualizar el Signal del Storage al remover un rol individual', fakeAsync(() => {
    // Arrange: Preparamos un usuario con múltiples roles
    userStorage.updateUsersList((users) => users.map(u => ({ ...u, roles: ['ESTUDIANTE' as UserRoleType, 'DIRECTOR' as UserRoleType] })));

    // Act
    userService.removeRoleFromUser('user-123', 'DIRECTOR' as UserRoleType).subscribe();
    tick(500); // delay de 500ms en el removeRoleFromUser

    // Assert
    const updatedUser = userStorage.getUsersSnapshot().find(u => u.id === 'user-123');

    expect(updatedUser?.roles).toContain('ESTUDIANTE');
    expect(updatedUser?.roles).not.toContain('DIRECTOR');
  }));

  it('debe remover roles masivos y actualizar la sesión actual si el usuario afectado está logueado', fakeAsync(() => {
    // Arrange: Seteamos al usuario afectado como el "currentUser" (Sesión activa)
    const currentUser = createMockUser({ id: 'user-123', roles: ['ESTUDIANTE' as UserRoleType, 'JURADO' as UserRoleType] });
    userStorage.setCurrentUser(currentUser);
    userStorage.updateUsersList(() => [currentUser]);

    // Act: Usamos el método de remoción masiva que tiene delay(600)
    userService.removeRolesFromUsersMock(['user-123'], ['JURADO' as UserRoleType]).subscribe();
    tick(600);

    // Assert 1: La lista global de usuarios se actualizó
    const updatedGlobalUser = userStorage.getUsersSnapshot().find(u => u.id === 'user-123');
    expect(updatedGlobalUser?.roles).not.toContain('JURADO');

    // Assert 2: El Signal de la sesión activa TAMBIÉN se sincronizó
    const session = userStorage.currentUser();
    expect(session?.roles).not.toContain('JURADO');
    expect(session?.roles).toContain('ESTUDIANTE');
  }));
});
