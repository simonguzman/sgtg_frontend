import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { signal, WritableSignal } from '@angular/core';

import { InboxEventProcessorService } from './inbox-event-processor.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxStateService } from './inbox-state.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../core/services/auth/auth.service';

import { AppEvent } from '../../../core/interfaces/app-event.interface';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { InboxMessage, InboxStatus } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
import { InboxEventContext } from '../pages/notifications-page/models/inbox-event-context.model';

// Importamos el helper y el diccionario para poder interceptarlos
import * as contextHelper from '../helpers/inbox-event-context.helper';
import { INBOX_MESSAGE_BUILDERS } from './inbox-message-builders';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  roles: [],
  ...overrides
} as User);

const createMockAppEvent = (overrides: Partial<AppEvent> = {}): AppEvent => ({
  type: AppEventType.PROPOSAL_DEADLINE_EXPIRED,
  targetUserIds: ['user-1'],
  payload: {},
  ...overrides
} as AppEvent);

const createMockInboxEventContext = (overrides: Partial<InboxEventContext> = {}): InboxEventContext => ({
  payload: {},
  proposalTitle: 'Propuesta sin título',
  draftTitle: 'Anteproyecto sin título',
  thesisTitle: 'Trabajo de grado sin título',
  ...overrides
} as InboxEventContext);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('InboxEventProcessorService', () => {
  let service: InboxEventProcessorService;

  // Dependencias mockeadas (Tipos Estrictos)
  let eventsSubject: Subject<AppEvent>;
  let addMessagesSpy: jest.Mock<void, [InboxMessage[]]>;
  let showNotificationSpy: jest.Mock<void, [any]>; // El payload real depende de tu NotificationService
  let mockCurrentUserSignal: WritableSignal<User | null>;

  // Spies para helpers externos
  let extractContextSpy: jest.SpyInstance;
  let mockBuilder: jest.Mock;

  // Objeto base simulado que retornaría el Builder
  const mockBaseMessage: Omit<InboxMessage, 'id' | 'userId'> = {
    type: NotificationType.INFO,
    title: 'Título Mock',
    message: 'Mensaje Mock',
    date: new Date('2026-08-10T12:00:00Z'),
    status: 'no leido'
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Preparamos los mocks reactivos y espías
    eventsSubject = new Subject<AppEvent>();
    addMessagesSpy = jest.fn();
    showNotificationSpy = jest.fn();
    mockCurrentUserSignal = signal<User | null>(null);

    // Mockeamos la API nativa de UUID para garantizar predictibilidad
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mock-uuid-1234') },
      configurable: true
    });

    // 2. Interceptamos el helper (para no depender de su lógica real)
    extractContextSpy = jest.spyOn(contextHelper, 'extractInboxEventContext')
      .mockReturnValue(createMockInboxEventContext());

    // 3. Preparamos el builder simulado
    mockBuilder = jest.fn().mockReturnValue(mockBaseMessage);

    // Inyectamos nuestro builder simulado temporalmente en el diccionario real
    Object.defineProperty(INBOX_MESSAGE_BUILDERS, AppEventType.PROPOSAL_DEADLINE_EXPIRED, {
      value: mockBuilder,
      writable: true,
      configurable: true
    });

    TestBed.configureTestingModule({
      providers: [
        InboxEventProcessorService,
        // Proveemos el observable simulado
        { provide: EventBusService, useValue: { events$: eventsSubject.asObservable() } },
        { provide: InboxStateService, useValue: { addMessages: addMessagesSpy } },
        { provide: NotificationService, useValue: { show: showNotificationSpy } },
        { provide: AuthService, useValue: { currentUser: mockCurrentUserSignal } }
      ]
    });

    // Instanciar el servicio activa el constructor y la suscripción
    service = TestBed.inject(InboxEventProcessorService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    // Limpieza de nuestro builder temporal para no contaminar otros tests
    delete (INBOX_MESSAGE_BUILDERS as Record<string, unknown>)[AppEventType.PROPOSAL_DEADLINE_EXPIRED];
  });

  describe('Procesamiento de Eventos', () => {
    it('debe ignorar el evento si no hay usuarios destino (targetUserIds está vacío)', () => {
      const emptyEvent = createMockAppEvent({ targetUserIds: [] });

      eventsSubject.next(emptyEvent);

      expect(extractContextSpy).not.toHaveBeenCalled();
      expect(addMessagesSpy).not.toHaveBeenCalled();
    });

    it('debe ignorar el evento si no existe un Builder configurado para ese tipo de evento', () => {
      // Usamos un tipo de evento simulando uno no registrado en el diccionario
      // El cast as AppEventType es válido aquí para probar comportamientos de fallback o eventos desactualizados
      const unknownEvent = createMockAppEvent({ type: 'EVENTO_DESCONOCIDO' as AppEventType });

      eventsSubject.next(unknownEvent);

      // Extrae el contexto pero se detiene porque buildMessage es null
      expect(extractContextSpy).toHaveBeenCalled();
      expect(addMessagesSpy).not.toHaveBeenCalled();
    });

    it('debe construir y guardar mensajes para todos los usuarios destino (Notificación silenciosa)', () => {
      const validEvent = createMockAppEvent({
        type: AppEventType.PROPOSAL_DEADLINE_EXPIRED,
        targetUserIds: ['user-1', 'user-2']
      });

      // El usuario actual NO está en la lista de destinos
      mockCurrentUserSignal.set(createMockUser({ id: 'user-99' }));

      eventsSubject.next(validEvent);

      // 1. Verificamos que se haya construido el mensaje
      expect(mockBuilder).toHaveBeenCalled();

      // 2. Verificamos que se guarden 2 mensajes en el State, inyectando ID y UserID
      expect(addMessagesSpy).toHaveBeenCalledWith([
        { ...mockBaseMessage, id: 'mock-uuid-1234', userId: 'user-1' },
        { ...mockBaseMessage, id: 'mock-uuid-1234', userId: 'user-2' }
      ]);

      // 3. Como el currentUser NO estaba en la lista, NO se debe mostrar la notificación visual (Toast)
      expect(showNotificationSpy).not.toHaveBeenCalled();
    });

    it('debe mostrar un Toast (NotificationService) si el usuario actual es uno de los destinos', () => {
      const validEvent = createMockAppEvent({
        type: AppEventType.PROPOSAL_DEADLINE_EXPIRED,
        targetUserIds: ['user-1', 'user-2']
      });

      // Configuramos al usuario actual para que coincida con uno de los destinos
      mockCurrentUserSignal.set(createMockUser({ id: 'user-2' }));

      eventsSubject.next(validEvent);

      // Se guarda en base de datos local (Inbox)
      expect(addMessagesSpy).toHaveBeenCalled();

      // Adicionalmente, se dispara el Toast en pantalla
      expect(showNotificationSpy).toHaveBeenCalledTimes(1);
      expect(showNotificationSpy).toHaveBeenCalledWith({
        type: mockBaseMessage.type,
        title: mockBaseMessage.title,
        message: mockBaseMessage.message,
        autoDismiss: true
      });
    });
  });
});
