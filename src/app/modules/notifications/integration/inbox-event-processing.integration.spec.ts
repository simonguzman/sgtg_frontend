import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { ApplicationRef } from '@angular/core';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxService } from '../services/inbox.service';
import { InboxStateService } from '../services/inbox-state.service';
import { InboxEventProcessorService } from '../services/inbox-event-processor.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { User } from '../../users/interfaces/user.interface';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);
interface NotificationPayload {
  type: NotificationType;
  title: string;
  message: string;
  autoDismiss?: boolean;
}

describe('Integración [Notifications]: Procesamiento de Eventos (Pub/Sub ➔ Inbox)', () => {
  let eventBus: EventBusService;
  let inboxService: InboxService;
  let inboxState: InboxStateService;
  let notificationServiceMock: { show: jest.Mock<void, [NotificationPayload]> };
  let appRef: ApplicationRef;
  const activeUserId = 'user-active-001';
  const otherUserId = 'user-other-002';
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    notificationServiceMock = { show: jest.fn() };
    const activeUser = createMockUser({
      id: activeUserId,
      firstName: 'Simón',
      lastName: 'Activo',
      roles: [UserRoleType.ESTUDIANTE],
      email: 'simon@test.com'
    });
    const authServiceMock = {
      currentUser: jest.fn().mockReturnValue(activeUser)
    };
    TestBed.configureTestingModule({
      providers: [
        EventBusService,
        InboxStateService,
        InboxEventProcessorService,
        InboxService,
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });
    eventBus = TestBed.inject(EventBusService);
    inboxService = TestBed.inject(InboxService);
    inboxState = TestBed.inject(InboxStateService);
    appRef = TestBed.inject(ApplicationRef);
    localStorage.clear();
    inboxState.clearAllMessages(activeUserId);
    inboxState.clearAllMessages(otherUserId);
  });
  it('debe procesar el evento, guardarlo en la bandeja del destinatario y lanzar el Toast si está en sesión', () => {
    expect(inboxService.messages()).toHaveLength(0);
    eventBus.emit({
      type: AppEventType.PROPOSAL_CREATED,
      targetUserIds: [activeUserId],
      payload: {
        proposalId: 'prop-123',
        proposalTitle: 'Inteligencia Artificial en el Agro'
      }
    });
    appRef.tick();
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(1);
    expect(allStoredMessages[0].title).toBe('Nueva propuesta registrada');
    const userMessages = inboxService.messages();
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0].actionUrl).toBe('/proposal/details/prop-123');
    expect(userMessages[0].status).toBe('no leido');
    expect(notificationServiceMock.show).toHaveBeenCalledWith({
      type: NotificationType.INFO,
      title: 'Nueva propuesta registrada',
      message: 'El director ha registrado la propuesta: "Inteligencia Artificial en el Agro"',
      autoDismiss: true
    });
  });
  it('debe guardar el mensaje para otro usuario pero NO lanzar el Toast en la sesión actual', () => {
    eventBus.emit({
      type: AppEventType.THESIS_FINAL_DELIVERY_UPLOADED,
      targetUserIds: [otherUserId],
      payload: {
        thesisId: 'thesis-456',
        thesisTitle: 'Machine Learning aplicado'
      }
    });
    appRef.tick();
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(1);
    expect(allStoredMessages[0].userId).toBe(otherUserId);
    expect(inboxService.messages()).toHaveLength(0);
    expect(notificationServiceMock.show).not.toHaveBeenCalled();
  });
  it('debe enviar la misma notificación a múltiples involucrados simultáneamente', () => {
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
    const allStoredMessages = inboxState.messagesSignal();
    expect(allStoredMessages).toHaveLength(2);
    const activeUserMessages = inboxService.messages();
    expect(activeUserMessages).toHaveLength(1);
    expect(activeUserMessages[0].userId).toBe(activeUserId);
    expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
  });
});
