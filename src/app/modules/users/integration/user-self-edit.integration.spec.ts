import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';

// Servicios reales (La costura a evaluar)
import { UserFormFacadeService } from '../pages/services/user-form-facade.service';
import { UserService } from '../services/user.service';
import { UserStorageService } from '../services/user-storage.service';
import { UserApiService } from '../services/user-api.service';
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
  firstName: 'Simón',
  lastName: 'Guzmán',
  secondLastName: 'Anaya',
  codeNumber: 202601,
  email: 'simon@unicauca.edu.co',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Users]: Edición de Perfil y Sincronización de Sesión', () => {
  let formFacade: UserFormFacadeService;
  let storage: UserStorageService;
  let routerMock: { navigate: jest.Mock };
  let notificationMock: { show: jest.Mock };
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    // Mocks estrictamente para lo que sale del módulo (UI/Rutas)
    routerMock = { navigate: jest.fn() };
    notificationMock = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        // Lógica de negocio real sin mocks
        UserFormFacadeService,
        UserService,
        UserStorageService,
        UserApiService,
        UserFormatterService,
        { provide: Router, useValue: routerMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    });

    formFacade = TestBed.inject(UserFormFacadeService);
    storage = TestBed.inject(UserStorageService);

    // Arrange: Sembramos un usuario y LO INICIAMOS EN SESIÓN
    const activeAdmin = createMockUser({ id: 'admin-123', firstName: 'Juan', lastName: 'Pérez' });
    storage.updateUsersList(() => [activeAdmin]);
    storage.setCurrentUser(activeAdmin);
  });

  afterEach(() => {
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('debe actualizar la lista de usuarios Y el signal de currentUser si el usuario edita su propio perfil', fakeAsync(() => {
    // Arrange: Preparamos los datos a actualizar (Cambiamos el nombre)
    const updatePayload = createMockUser({
      id: 'admin-123',
      firstName: 'Juan Modificado',
      lastName: 'Pérez'
    });

    let successCallbackCalled = false;

    // Act: Disparamos la actualización desde el Facade
    formFacade.updateUser(
      'admin-123',
      updatePayload,
      () => { successCallbackCalled = true; },
      () => {}
    );

    // Simulamos el paso del tiempo por el delay(800) de UserApiService
    tick(800);

    // Assert 1: Callbacks y navegación
    expect(successCallbackCalled).toBe(true);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/users']);

    // Assert 2: Verificamos que la Lista Global se actualizó
    const listUser = storage.getUsersSnapshot().find(u => u.id === 'admin-123');
    expect(listUser?.firstName).toBe('Juan Modificado');

    // Assert 3 (El más crítico): Verificamos que la sesión activa también reaccionó al instante
    const sessionUser = storage.currentUser();
    expect(sessionUser?.firstName).toBe('Juan Modificado');
  }));

  it('NO debe actualizar el currentUser si el administrador edita a OTRA persona', fakeAsync(() => {
    // Arrange: Agregamos a un estudiante distinto a la lista
    const student = createMockUser({ id: 'student-999', firstName: 'Pedro' });
    storage.updateUsersList(current => [...current, student]);

    // La sesión actual sigue siendo 'admin-123'
    const initialSession = storage.currentUser();

    // Act: El admin edita al estudiante
    const updatePayload = createMockUser({ id: 'student-999', firstName: 'Pedro Editado' });
    formFacade.updateUser('student-999', updatePayload, () => {}, () => {});
    tick(800);

    // Assert 1: El estudiante sí se actualizó en la lista general
    const listUser = storage.getUsersSnapshot().find(u => u.id === 'student-999');
    expect(listUser?.firstName).toBe('Pedro Editado');

    // Assert 2: La sesión del administrador quedó INTACTA
    const sessionUser = storage.currentUser();
    expect(sessionUser?.id).toBe(initialSession?.id);
    expect(sessionUser?.firstName).toBe('Juan'); // El original del admin
  }));
});
