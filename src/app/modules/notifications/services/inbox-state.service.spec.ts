import { TestBed } from '@angular/core/testing';
import { InboxStateService } from './inbox-state.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

// --- INTERFAZ ESTRICTA ---
// Usamos NotificationType directamente para asegurar compatibilidad total
interface TestInboxMessage {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  date: Date;
  status: 'leido' | 'no leido';
  actionUrl?: string;
}

// Estructura esperada al leer JSON del LocalStorage (la fecha llega como string)
interface StoredInboxMessage extends Omit<TestInboxMessage, 'date'> {
  date: string;
}

describe('Service: InboxState', () => {
  let service: InboxStateService;
  const STORAGE_KEY = 'academic_inbox_messages';
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    // 1. Limpiar el storage falso antes de cada prueba
    mockStorage = {};

    // 2. Interceptar las llamadas a localStorage de forma estricta
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string): string | null => {
      return key in mockStorage ? mockStorage[key] : null;
    });

    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string): void => {
      mockStorage[key] = value;
    });

    // 3. Configurar el módulo
    TestBed.configureTestingModule({
      providers: [InboxStateService]
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y LocalStorage', () => {
    it('Debe inicializar con un arreglo vacío si el LocalStorage está vacío', () => {
      service = TestBed.inject(InboxStateService);
      expect(service.messagesSignal()).toEqual([]);
    });

    it('Debe cargar mensajes del LocalStorage y reconstruir los objetos Date', () => {
      const storedDate = new Date('2026-06-19T10:00:00Z');
      const mockStoredData: StoredInboxMessage[] = [{
        id: 'msg-1',
        userId: 'user-1',
        type: NotificationType.INFO,
        title: 'Prueba',
        message: 'Mensaje de prueba',
        date: storedDate.toISOString(),
        status: 'no leido'
      }];

      mockStorage[STORAGE_KEY] = JSON.stringify(mockStoredData);

      // Instanciamos el servicio DESPUÉS de llenar el LocalStorage simulado
      service = TestBed.inject(InboxStateService);

      const messages = service.messagesSignal();
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe('msg-1');
      // Verificamos que la reconstrucción del Date funcionó correctamente
      expect(messages[0].date).toBeInstanceOf(Date);
      expect(messages[0].date.getTime()).toEqual(storedDate.getTime());
    });

    it('Debe capturar errores si el JSON del LocalStorage es inválido y devolver un arreglo vacío', () => {
      mockStorage[STORAGE_KEY] = '{ invalid_json: "esto rompe el parseo" ';

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      service = TestBed.inject(InboxStateService);

      expect(service.messagesSignal()).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Error parseando notificaciones de localStorage', expect.any(Error));
    });
  });

  describe('Operaciones de Estado (Signals)', () => {
    beforeEach(() => {
      service = TestBed.inject(InboxStateService);
    });

    it('Debe agregar nuevos mensajes al inicio de la lista (prepend)', () => {
      const msg1: TestInboxMessage = { id: '1', userId: 'u1', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'no leido' };
      const msg2: TestInboxMessage = { id: '2', userId: 'u1', type: NotificationType.INFO, title: 'T2', message: 'M2', date: new Date(), status: 'no leido' };

      service.addMessages([msg1]);
      service.addMessages([msg2]);

      const messages = service.messagesSignal();
      expect(messages.length).toBe(2);
      expect(messages[0].id).toBe('2');
      expect(messages[1].id).toBe('1');
    });

    it('Debe marcar un mensaje específico como leído', () => {
      const msg1: TestInboxMessage = { id: '1', userId: 'u1', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'no leido' };
      service.addMessages([msg1]);

      service.markAsRead('1');

      const messages = service.messagesSignal();
      expect(messages[0].status).toBe('leido');
    });

    it('Debe eliminar un mensaje específico por su ID', () => {
      const msg1: TestInboxMessage = { id: '1', userId: 'u1', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'no leido' };
      const msg2: TestInboxMessage = { id: '2', userId: 'u1', type: NotificationType.INFO, title: 'T2', message: 'M2', date: new Date(), status: 'no leido' };
      service.addMessages([msg1, msg2]);

      service.deleteMessage('1');

      const messages = service.messagesSignal();
      expect(messages.length).toBe(1);
      expect(messages[0].id).toBe('2');
    });

    it('Debe limpiar únicamente los mensajes correspondientes a un usuario específico', () => {
      const msgUser1: TestInboxMessage = { id: '1', userId: 'user-1', type: NotificationType.INFO, title: 'T1', message: 'M1', date: new Date(), status: 'no leido' };
      const msgUser2: TestInboxMessage = { id: '2', userId: 'user-2', type: NotificationType.INFO, title: 'T2', message: 'M2', date: new Date(), status: 'no leido' };
      service.addMessages([msgUser1, msgUser2]);

      service.clearAllMessages('user-1');

      const messages = service.messagesSignal();
      expect(messages.length).toBe(1);
      expect(messages[0].userId).toBe('user-2');
    });
  });

  describe('Sincronización Reactiva (Effects)', () => {
    it('Debe guardar automáticamente en LocalStorage cuando el Signal cambia', () => {
      service = TestBed.inject(InboxStateService);

      const newMsg: TestInboxMessage = {
        id: '99',
        userId: 'u1',
        type: NotificationType.INFO,
        title: 'Efecto Reactivo',
        message: 'Prueba de effect()',
        date: new Date('2026-06-19T12:00:00Z'),
        status: 'no leido'
      };

      service.addMessages([newMsg]);

      // Obligamos a Angular a ejecutar el ciclo de effects pendiente
      TestBed.flushEffects();

      // Verificamos que el item fue escrito en el storage simulado
      const savedData = mockStorage[STORAGE_KEY];
      expect(savedData).toBeDefined();

      const parsedData = JSON.parse(savedData) as StoredInboxMessage[];
      expect(parsedData.length).toBe(1);
      expect(parsedData[0].id).toBe('99');
      expect(parsedData[0].title).toBe('Efecto Reactivo');
    });
  });
});
