import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { InboxEventProcessorService } from './inbox-event-processor.service';
import { AppEvent, AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxStateService } from './inbox-state.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

// --- DEFINICIONES DE TIPADO ESTRICTO PARA MOCKS ---
interface TestCurrentUser {
  id: string;
  username: string;
}

interface MockEventBusService {
  events$: Subject<AppEvent>;
}

interface MockInboxStateService {
  addMessages: jest.Mock<(messages: InboxMessage[]) => void>;
}

interface MockNotificationService {
  show: jest.Mock;
}

interface MockAuthService {
  currentUser: jest.Mock<TestCurrentUser | null>;
}

// Interfaz para estructurar los distintos payloads de prueba de manera segura
interface StrictTestPayload {
  id?: string;
  title?: string;
  proposalTitle?: string;
  draftTitle?: string;
  thesisTitle?: string;
  proposalId?: string;
  draftId?: string;
  thesisId?: string;
  thesisWorkId?: string;
  requestId?: string;
  sustentationId?: string;
  daysLeft?: number;
  veredict?: string;
  finalState?: string;
  status?: string;
  type?: string;
  isApproved?: boolean;
  proposalData?: {
    title: string;
  };
  preliminaryDraftData?: {
    proposalData?: {
      title: string;
    };
  };
}

describe('Service: InboxEventProcessor', () => {
  let service: InboxEventProcessorService;
  let eventBusMock: MockEventBusService;
  let inboxStateMock: MockInboxStateService;
  let notificationServiceMock: MockNotificationService;
  let authServiceMock: MockAuthService;

  beforeEach(() => {
    // 1. Inicialización de controladores reactivos y espías
    eventBusMock = {
      events$: new Subject<AppEvent>()
    };

    inboxStateMock = {
      addMessages: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    authServiceMock = {
      currentUser: jest.fn(() => null)
    };

    // 2. Configuración del entorno de pruebas de Angular
    TestBed.configureTestingModule({
      providers: [
        InboxEventProcessorService,
        { provide: EventBusService, useValue: eventBusMock },
        { provide: InboxStateService, useValue: inboxStateMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: AuthService, useValue: authServiceMock }
      ]
    });

    service = TestBed.inject(InboxEventProcessorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Debe instanciarse correctamente el procesador de eventos', () => {
    expect(service).toBeTruthy();
  });

  describe('Filtros de Seguridad y Guardianes', () => {
    it('NO debe procesar nada si la lista de "targetUserIds" está vacía o es nula', () => {
      const emptyEvent: AppEvent = {
        type: AppEventType.PROPOSAL_CREATED,
        targetUserIds: [],
        payload: { title: 'Propuesta Huérfana' } as StrictTestPayload
      };

      eventBusMock.events$.next(emptyEvent);

      expect(inboxStateMock.addMessages).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });
  });

  describe('Procesamiento y Mapeo de Mensajes (Estructura de Datos)', () => {
    it('Debe mapear un evento PROPOSAL_CREATED correctamente y generar identificadores únicos', () => {
      const payloadData: StrictTestPayload = { id: 'p-100', title: 'Diseño Arquitectónico' };
      const event: AppEvent = {
        type: AppEventType.PROPOSAL_CREATED,
        targetUserIds: ['user-id-abc'],
        payload: payloadData
      };

      eventBusMock.events$.next(event);

      expect(inboxStateMock.addMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String), // Verifica que genera el UUID dinámico
            userId: 'user-id-abc',
            type: NotificationType.INFO,
            title: 'Nueva Propuesta Registrada',
            message: 'El director ha registrado la propuesta: "Diseño Arquitectónico"',
            actionUrl: '/proposal/details/p-100',
            status: 'no leido'
          })
        ])
      );
    });

    it('Debe resolver la jerarquía de títulos del payload cuando se procesan Anteproyectos', () => {
      const payloadData: StrictTestPayload = {
        id: 'draft-55',
        proposalData: { title: 'Sistema de Gestión Académica' }
      };

      const event: AppEvent = {
        type: AppEventType.PRELIMINARY_DRAFT_CREATED,
        targetUserIds: ['comite-user'],
        payload: payloadData
      };

      eventBusMock.events$.next(event);

      expect(inboxStateMock.addMessages).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: 'El director ha radicado el anteproyecto: "Sistema de Gestión Académica" para revisión del comité.',
            actionUrl: '/preliminary-draft/details/draft-55'
          })
        ])
      );
    });

    it('Debe expandir y registrar un mensaje independiente para cada usuario objetivo dentro del arreglo', () => {
      const payloadData: StrictTestPayload = { proposalId: 'prop-2', title: 'Propuesta Multiusuario' };
      const event: AppEvent = {
        type: AppEventType.PROPOSAL_DEADLINE_WARNING,
        targetUserIds: ['id-miembro-1', 'id-miembro-2', 'id-miembro-3'],
        payload: { ...payloadData, daysLeft: 3 }
      };

      eventBusMock.events$.next(event);

      // Verificamos que se enviaron exactamente los 3 registros correspondientes en una sola operación por lote
      expect(inboxStateMock.addMessages).toHaveBeenCalledTimes(1);
      const argumentPassed = inboxStateMock.addMessages.mock.calls[0][0];
      expect(argumentPassed.length).toBe(3);
      expect(argumentPassed[0].userId).toBe('id-miembro-1');
      expect(argumentPassed[1].userId).toBe('id-miembro-2');
      expect(argumentPassed[2].userId).toBe('id-miembro-3');
    });
  });

  describe('Efectos Secundarios e Interfaz de Usuario (Toasts)', () => {
    it('Debe disparar un aviso Toast emergente si el usuario activo en sesión se encuentra entre los destinatarios del evento', () => {
      // Simulamos que el usuario en sesión es 'user-alpha'
      authServiceMock.currentUser.mockReturnValue({ id: 'user-alpha', username: 'simon.guzman' });

      const payloadData: StrictTestPayload = { id: 'p-1', title: 'Optimización de Algoritmos' };
      const event: AppEvent = {
        type: AppEventType.PROPOSAL_CREATED,
        targetUserIds: ['user-beta', 'user-alpha'], // 'user-alpha' es alcanzado
        payload: payloadData
      };

      eventBusMock.events$.next(event);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INFO,
          title: 'Nueva Propuesta Registrada',
          autoDismiss: true
        })
      );
    });

    it('NO debe disparar un aviso Toast si el usuario activo en sesión NO forma parte del grupo de destinatarios', () => {
      authServiceMock.currentUser.mockReturnValue({ id: 'user-isolated', username: 'otro.usuario' });

      const payloadData: StrictTestPayload = { thesisId: 't-9', thesisTitle: 'Análisis de Redes' };
      const event: AppEvent = {
        type: AppEventType.THESIS_DEADLINE_EXPIRED,
        targetUserIds: ['user-beta'], // Destinado a alguien más
        payload: payloadData
      };

      eventBusMock.events$.next(event);

      expect(inboxStateMock.addMessages).toHaveBeenCalled(); // Se registra en la base del estado/inbox de destino
      expect(notificationServiceMock.show).not.toHaveBeenCalled(); // No interrumpe la pantalla del usuario actual
    });

    it('NO debe lanzar errores ni disparar Toasts si no existe ninguna sesión iniciada en el cliente', () => {
      authServiceMock.currentUser.mockReturnValue(null); // Deslogueado

      const event: AppEvent = {
        type: AppEventType.REVIEWERS_ASSIGNED,
        targetUserIds: ['jurado-1'],
        payload: { draftId: 'd-1', draftTitle: 'Estudio de Datos' } as StrictTestPayload
      };

      expect(() => {
        eventBusMock.events$.next(event);
      }).not.toThrow();

      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });
  });

  describe('Manejo de Casos Especiales y Lógica Condicional', () => {
    it('Debe adaptar dinámicamente el tipo de notificación en THESIS_PAZ_Y_SALVO_REGISTERED basándose en la aprobación', () => {
      const payloadAprobado: StrictTestPayload = { thesisId: 'th-1', thesisTitle: 'Proyecto Final', isApproved: true };
      const eventAprobado: AppEvent = {
        type: AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
        targetUserIds: ['estudiante-1'],
        payload: payloadAprobado
      };

      eventBusMock.events$.next(eventAprobado);
      expect(inboxStateMock.addMessages).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: NotificationType.CONFIRMATION })
        ])
      );

      const payloadRechazado: StrictTestPayload = { thesisId: 'th-1', thesisTitle: 'Proyecto Final', isApproved: false };
      const eventRechazado: AppEvent = {
        type: AppEventType.THESIS_PAZ_Y_SALVO_REGISTERED,
        targetUserIds: ['estudiante-1'],
        payload: payloadRechazado
      };

      eventBusMock.events$.next(eventRechazado);
      expect(inboxStateMock.addMessages).toHaveBeenLastCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: NotificationType.ERROR })
        ])
      );
    });
  });
});
