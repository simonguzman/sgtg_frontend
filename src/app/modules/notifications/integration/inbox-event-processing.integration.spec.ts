import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';

// Servicios del Módulo (Las piezas del dominó)
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxService } from '../services/inbox.service';
import { InboxStateService } from '../services/inbox-state.service';
import { InboxEventProcessorService } from '../services/inbox-event-processor.service';

// Dependencias Externas (Mocks controlados)
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

// Modelos y Enums
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';

describe('Integración [Notifications]: Procesamiento de Eventos (Pub/Sub ➔ Inbox)', () => {
  let eventBus: EventBusService;
  let inboxService: InboxService;
  let inboxState: InboxStateService;
  let notificationServiceMock: { show: jest.Mock };
  let appRef: ApplicationRef;

  // Creamos dos IDs de usuarios distintos para evaluar el aislamiento de datos
  const activeUserId = 'user-active-001';
  const otherUserId = 'user-other-002';

  beforeEach(() => {
    // Mock del servicio de alertas visuales (Toast)
    notificationServiceMock = { show: jest.fn() };

    // Mock del AuthService para simular quién está logueado en la aplicación
    const authServiceMock = {
      currentUser: jest.fn().mockReturnValue({
        id: activeUserId,
        idType: IdentificationType.CC,
        idNumber: 123,
        firstName: 'Simón',
        lastName: 'Activo',
        secondLastName: '',
        codeNumber: 123,
        roles: [UserRoleType.ESTUDIANTE],
        email: 'simon@test.com',
        password: 'hash',
        state: UserState.active
      })
    };

    TestBed.configureTestingModule({
      providers: [
        // Servicios reales a evaluar
        EventBusService,
        InboxStateService,
        InboxEventProcessorService,
        InboxService,
        // Inyecciones simuladas
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    eventBus = TestBed.inject(EventBusService);
    inboxService = TestBed.inject(InboxService);
    inboxState = TestBed.inject(InboxStateService);
    appRef = TestBed.inject(ApplicationRef);

    // Limpiamos el storage simulado para no arrastrar basura entre tests
    localStorage.clear();
    // Vaciamos el state service (necesario si arrastró datos de tests previos)
    inboxState.clearAllMessages(activeUserId);
    inboxState.clearAllMessages(otherUserId);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe procesar el evento, guardarlo en la bandeja del destinatario y lanzar el Toast si está en sesión', () => {
    // Arrange: Validamos que la bandeja inicia vacía
    expect(inboxService.messages()).toHaveLength(0);

    // Act: Emitimos un evento global destinado al usuario actualmente logueado
    eventBus.emit({
      type: AppEventType.PROPOSAL_CREATED,
      targetUserIds: [activeUserId],
      payload: {
        proposalId: 'prop-123',
        proposalTitle: 'Inteligencia Artificial en el Agro'
      }
    });

    appRef.tick(); // Forzamos la actualización de Signals

    // Assert 1: La base de datos local guardó el mensaje
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(1);
    expect(allStoredMessages[0].title).toBe('Nueva propuesta registrada');

    // Assert 2: El InboxService (que filtra por usuario activo) refleja el mensaje
    const userMessages = inboxService.messages();
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0].actionUrl).toBe('/proposal/details/prop-123');
    expect(userMessages[0].status).toBe('no leido');

    // Assert 3: Como el destinatario es el usuario en sesión, el Toast debió saltar
    expect(notificationServiceMock.show).toHaveBeenCalledWith({
      type: NotificationType.INFO,
      title: 'Nueva propuesta registrada',
      message: 'El director ha registrado la propuesta: "Inteligencia Artificial en el Agro"',
      autoDismiss: true
    });
  });

  it('debe guardar el mensaje para otro usuario pero NO lanzar el Toast en la sesión actual', () => {
    // Act: Emitimos un evento destinado a OTRO usuario (no el que está en sesión)
    eventBus.emit({
      type: AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
      targetUserIds: [otherUserId],
      payload: {
        thesisId: 'thesis-456',
        thesisTitle: 'Machine Learning aplicado'
      }
    });

    appRef.tick();

    // Assert 1: El estado global guardó el mensaje para la otra persona
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(1);
    expect(allStoredMessages[0].userId).toBe(otherUserId);

    // Assert 2: El InboxService de la sesión actual debe seguir VACÍO
    expect(inboxService.messages()).toHaveLength(0);

    // Assert 3: El Toast NO debió saltar en la pantalla del usuario activo
    expect(notificationServiceMock.show).not.toHaveBeenCalled();
  });

  it('debe enviar la misma notificación a múltiples involucrados simultáneamente', () => {
    // Act: Emitimos un evento destinado a ambos usuarios
    eventBus.emit({
      type: AppEventType.SPECIAL_REQUEST_RESOLVED,
      targetUserIds: [activeUserId, otherUserId],
      payload: {
        thesisId: 'thesis-999',
        thesisTitle: 'IoT y Redes',
        status: 'Aprobado'
      }
    });

    appRef.tick();

    // Assert 1: Se crearon 2 registros independientes en la base de datos
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(2);

    // Assert 2: El usuario actual ve solo SU copia
    const activeUserMessages = inboxService.messages();
    expect(activeUserMessages).toHaveLength(1);
    expect(activeUserMessages[0].userId).toBe(activeUserId);

    // Assert 3: El Toast del usuario activo se lanzó
    expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
  });
});
