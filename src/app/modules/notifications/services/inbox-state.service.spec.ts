import { TestBed } from '@angular/core/testing';
import { InboxStateService } from './inbox-state.service';
import { InboxMessage } from '../interfaces/inbox-message.interface';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-default',
  type: NotificationType.INFO,
  title: 'Título por defecto',
  message: 'Cuerpo por defecto',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('InboxStateService', () => {
  let service: InboxStateService;

  // Mock robusto de localStorage
  let store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: jest.fn((key: string) => (key in store ? store[key] : null)),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };

  const STORAGE_KEY = 'academic_inbox_messages';

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante los errores intencionales
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Reemplazamos el localStorage real del navegador por nuestro mock
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Reiniciamos el estado del mock antes de cada prueba
    store = {};
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  describe('Inicialización y loadFromStorage', () => {
    it('debe inicializar con un arreglo vacío si el storage está vacío', () => {
      TestBed.configureTestingModule({ providers: [InboxStateService] });
      service = TestBed.inject(InboxStateService);

      expect(service.messagesSignal()).toEqual([]);
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('debe parsear los datos y convertir las fechas de string a objetos Date', () => {
      // Simulamos la estructura exacta que guardaría localStorage (date como string)
      const storedData = [
        {
          id: '1',
          userId: 'user-1',
          type: NotificationType.INFO,
          title: 'Título 1',
          message: 'Mensaje 1',
          status: 'no leido',
          date: '2026-08-10T12:00:00.000Z'
        }
      ];
      store[STORAGE_KEY] = JSON.stringify(storedData);

      TestBed.configureTestingModule({ providers: [InboxStateService] });
      service = TestBed.inject(InboxStateService);

      const state = service.messagesSignal();
      expect(state.length).toBe(1);
      expect(state[0].title).toBe('Título 1');
      // Verificamos que la reconstrucción del Date funcionó correctamente
      expect(state[0].date).toBeInstanceOf(Date);
      expect(state[0].date.toISOString()).toBe('2026-08-10T12:00:00.000Z');
    });

    it('debe manejar errores de parseo limpiando el storage corrupto y retornando un arreglo vacío', () => {
      // Simulamos un JSON inválido/corrupto
      store[STORAGE_KEY] = '{ corrupted_json: true ';

      TestBed.configureTestingModule({ providers: [InboxStateService] });
      service = TestBed.inject(InboxStateService);

      expect(service.messagesSignal()).toEqual([]);
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
      // Validamos que el servicio intentó notificar el error por consola
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Mutaciones del Estado (Signals)', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({ providers: [InboxStateService] });
      service = TestBed.inject(InboxStateService);
    });

    it('debe agregar nuevos mensajes al inicio de la lista (addMessages)', () => {
      const initialMessage = createMockInboxMessage({ id: 'old-1' });
      service.addMessages([initialMessage]);

      const newMessage = createMockInboxMessage({ id: 'new-1' });
      service.addMessages([newMessage]);

      const state = service.messagesSignal();
      expect(state.length).toBe(2);
      expect(state[0].id).toBe('new-1'); // El nuevo entra primero (prepend)
      expect(state[1].id).toBe('old-1');
    });

    it('debe marcar un mensaje específico como leído (markAsRead)', () => {
      service.addMessages([createMockInboxMessage({ id: 'msg-1', status: 'no leido' })]);

      service.markAsRead('msg-1');

      const state = service.messagesSignal();
      expect(state[0].status).toBe('leido');
    });

    it('debe eliminar un mensaje específico (deleteMessage)', () => {
      service.addMessages([
        createMockInboxMessage({ id: 'msg-1' }),
        createMockInboxMessage({ id: 'msg-2' })
      ]);

      service.deleteMessage('msg-1');

      const state = service.messagesSignal();
      expect(state.length).toBe(1);
      expect(state[0].id).toBe('msg-2');
    });

    it('debe vaciar todos los mensajes de un usuario específico (clearAllMessages)', () => {
      service.addMessages([
        createMockInboxMessage({ id: '1', userId: 'user-a' }),
        createMockInboxMessage({ id: '2', userId: 'user-a' }),
        createMockInboxMessage({ id: '3', userId: 'user-b' }),
      ]);

      service.clearAllMessages('user-a');

      const state = service.messagesSignal();
      expect(state.length).toBe(1);
      expect(state[0].userId).toBe('user-b'); // Solo queda el del usuario B
    });
  });

  describe('Efectos secundarios (Effect / Persistencia)', () => {
    it('debe guardar automáticamente en localStorage cuando el signal muta', () => {
      TestBed.configureTestingModule({ providers: [InboxStateService] });
      service = TestBed.inject(InboxStateService);

      // Limpiamos los llamados previos producto de la inicialización
      mockLocalStorage.setItem.mockClear();

      const newMessage = createMockInboxMessage({ id: 'effect-1' });
      service.addMessages([newMessage]);

      // IMPORTANTE: En Angular, effect() corre asincrónicamente o durante el ciclo
      // de Change Detection. Usamos flushEffects() para forzar su ejecución en pruebas.
      TestBed.flushEffects();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STORAGE_KEY,
        JSON.stringify([newMessage])
      );
    });
  });
});
