// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { ThesisWorkPageFacadeService } from './thesis-work-page-facade.service';

// 3. Dependencias
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';

// 4. Interfaces, Enums y Modelos
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { THESIS_WORK_HEADER_BUTTONS, ThesisWorkTableRow } from '../models/thesis-work-page.model';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ────────────────────

interface MockThesisWorkService {
  thesisWorks: WritableSignal<ThesisWork[]>;
  reactivateThesisWorkMock: jest.Mock<Observable<void>, [string]>;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
  hasAnyRole: jest.Mock<boolean, [UserRoleType[]]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockThesisWorkPageMapperService {
  // FIX: Se actualiza la firma añadiendo el parámetro isConsejo (boolean)
  mapThesisWorkToTable: jest.Mock<ThesisWorkTableRow, [ThesisWork, boolean, boolean, boolean, string]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
    id: 'user-123',
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    roles: [],
    ...overrides
  };
  return base as User;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const base: Partial<ThesisWork> = {
    thesisWorkId: 'tw-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    isArchived: false,
    ...overrides
  };
  return base as ThesisWork;
};

const createMockTableRow = (overrides: Partial<ThesisWorkTableRow> = {}): ThesisWorkTableRow => {
  const base: Partial<ThesisWorkTableRow> = {
    id: 'row-1',
    title: 'Título de Fila',
    modality: 'TI',
    description: 'Descripción',
    state: stateList.EN_DESARROLLO,
    maxDeliveryDate: '2026-12-31',
    hiddenParticipants: '',
    allowedActions: ['ver', 'editar'],
    ...overrides
  };
  return base as ThesisWorkTableRow;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkPageFacadeService', () => {
  let service: ThesisWorkPageFacadeService;

  let thesisWorkMock: MockThesisWorkService;
  let authMock: MockAuthService;
  let notificationMock: MockNotificationService;
  let mapperMock: MockThesisWorkPageMapperService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkMock = {
      thesisWorks: signal([]),
      reactivateThesisWorkMock: jest.fn()
    };

    authMock = {
      currentUser: signal(createMockUser()),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    notificationMock = {
      show: jest.fn()
    };

    mapperMock = {
      mapThesisWorkToTable: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkPageFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkMock },
        { provide: AuthService, useValue: authMock },
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisWorkPageMapperService, useValue: mapperMock }
      ]
    });

    service = TestBed.inject(ThesisWorkPageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Propiedades y Estado Reactivo (Signals)', () => {
    it('debe exponer los botones de encabezado por defecto', () => {
      expect(service.headerButtons()).toEqual(THESIS_WORK_HEADER_BUTTONS);
    });

    it('debe filtrar trabajos archivados y enviar los permisos correctos (incluyendo isConsejo) al Mapper', () => {
      const mockActiveWork = createMockThesisWork({ thesisWorkId: 'tw-1', isArchived: false });
      const mockArchivedWork = createMockThesisWork({ thesisWorkId: 'tw-2', isArchived: true });
      const mockMappedRow = createMockTableRow({ id: 'row-1', title: 'Tesis Mapeada' });

      thesisWorkMock.thesisWorks.set([mockActiveWork, mockArchivedWork]);

      // Simulamos los roles exactos para probar la delegación de isConsejo
      authMock.hasAnyRole.mockImplementation((roles: UserRoleType[]) => {
        if (roles.includes(UserRoleType.ADMINISTRADOR)) return true; // isAdmin = true
        if (roles.includes(UserRoleType.CONSEJO)) return false;      // isConsejo = false
        if (roles.includes(UserRoleType.DECANATURA)) return true;    // hasFullAccess = true
        return false;
      });

      mapperMock.mapThesisWorkToTable.mockReturnValue(mockMappedRow);

      const result = service.tableData();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(mockMappedRow);

      expect(mapperMock.mapThesisWorkToTable).toHaveBeenCalledTimes(1);

      // FIX: Validación precisa de la nueva firma de parámetros
      expect(mapperMock.mapThesisWorkToTable).toHaveBeenCalledWith(
        mockActiveWork,
        true,        // hasFullAccessRole -> true (Por ADMINISTRADOR / DECANATURA)
        true,        // isAdmin -> true (Por ADMINISTRADOR)
        false,       // isConsejo -> false (Definido en el mock superior)
        'user-123'   // currentUser ID
      );
    });
  });

  describe('Flujos de Acción (reactivateThesis)', () => {
    it('debe mostrar notificación de procesamiento, confirmación y ejecutar onSuccess si la API responde bien', () => {
      thesisWorkMock.reactivateThesisWorkMock.mockReturnValue(of(void 0));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      service.reactivateThesis('tw-1', successCb, errorCb);

      expect(thesisWorkMock.reactivateThesisWorkMock).toHaveBeenCalledWith('tw-1');
      expect(successCb).toHaveBeenCalledTimes(1);
      expect(errorCb).not.toHaveBeenCalled();

      expect(notificationMock.show).toHaveBeenCalledTimes(2);
      expect(notificationMock.show).toHaveBeenNthCalledWith(1, {
        title: 'Reactivando trabajo',
        message: 'Procesando la solicitud...',
        type: NotificationType.INFO
      });
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Trabajo Reactivado',
        message: 'El trabajo ha sido reactivado correctamente.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debe mostrar notificación de error y ejecutar onError si la reactivación falla', () => {
      thesisWorkMock.reactivateThesisWorkMock.mockReturnValue(throwError(() => new Error('Error de conexión')));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      service.reactivateThesis('tw-1', successCb, errorCb);

      expect(errorCb).toHaveBeenCalledTimes(1);
      expect(successCb).not.toHaveBeenCalled();

      expect(notificationMock.show).toHaveBeenCalledTimes(2);
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Error',
        message: 'Hubo un error al reactivar el trabajo.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Notificaciones Utilitarias', () => {
    it('debe mostrar alerta estándar de restricción de acceso (showRestrictedAccessNotification)', () => {
      service.showRestrictedAccessNotification();

      expect(notificationMock.show).toHaveBeenCalledTimes(1);
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción o interactuar con este registro.',
        type: NotificationType.ERROR
      });
    });
  });
});
