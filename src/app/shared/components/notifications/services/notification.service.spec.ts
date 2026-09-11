import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { Notification, NotificationType } from '../models/notification.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockNotificationInput = (overrides: Partial<Omit<Notification, 'id'>> = {}): Omit<Notification, 'id'> => ({
  title: 'Título por defecto',
  message: 'Mensaje por defecto',
  type: NotificationType.INFO,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('NotificationService', () => {
  let service: NotificationService;

  // UUID con formato válido (5 secciones separadas por guiones: 8-4-4-4-12)
  const mockDefaultUuid = '12345678-1234-1234-1234-123456789012';
  let cryptoSpy: jest.SpyInstance;

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Activamos temporizadores falsos para controlar el paso del tiempo en setTimeout
    jest.useFakeTimers();

    // Mock seguro y tipado para crypto.randomUUID (Compatible con JSDOM / Node)
    if (!window.crypto) {
      Object.defineProperty(window, 'crypto', {
        value: { randomUUID: jest.fn().mockReturnValue(mockDefaultUuid) },
        writable: true
      });
      cryptoSpy = jest.spyOn(window.crypto, 'randomUUID');
    } else {
      cryptoSpy = jest.spyOn(window.crypto, 'randomUUID').mockReturnValue(mockDefaultUuid);
    }

    TestBed.configureTestingModule({
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    // Ejecuta los timers pendientes para evitar fugas de memoria en las pruebas
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaura console y window.crypto
  });

  describe('Inicialización', () => {
    it('debería inicializarse con una lista de notificaciones vacía', () => {
      expect(service.notifications()).toEqual([]);
    });
  });

  describe('Método show()', () => {
    it('debería agregar una notificación a la lista con un ID generado', () => {
      const mockInput = createMockNotificationInput({
        title: 'Título Test',
        message: 'Mensaje Test',
        type: NotificationType.INFO
      });

      service.show(mockInput);

      const list = service.notifications();
      expect(list).toHaveLength(1);
      expect(list[0]).toEqual({
        id: mockDefaultUuid,
        title: 'Título Test',
        message: 'Mensaje Test',
        type: NotificationType.INFO
      });
    });

    it('debería agregar las notificaciones al inicio de la lista (comportamiento LIFO)', () => {
      let counter = 1;

      // Aseguramos que el UUID falso cumpla estructuralmente con los 36 caracteres
      cryptoSpy.mockImplementation(() => {
        const suffix = String(counter++).padStart(12, '0');
        return `00000000-0000-0000-0000-${suffix}`;
      });

      service.show(createMockNotificationInput({ title: 'Primera' }));
      service.show(createMockNotificationInput({ title: 'Segunda' }));

      const list = service.notifications();
      expect(list).toHaveLength(2);
      expect(list[0].title).toBe('Segunda'); // La última en entrar es la primera de la lista
      expect(list[1].title).toBe('Primera');
    });
  });

  describe('Método dismiss()', () => {
    it('debería eliminar la notificación correspondiente al ID especificado', () => {
      service.show(createMockNotificationInput());
      expect(service.notifications()).toHaveLength(1);

      service.dismiss(mockDefaultUuid);

      expect(service.notifications()).toHaveLength(0);
    });

    it('no debería modificar la lista si el ID a descartar no existe', () => {
      service.show(createMockNotificationInput());
      expect(service.notifications()).toHaveLength(1);

      service.dismiss('00000000-0000-0000-0000-999999999999');

      expect(service.notifications()).toHaveLength(1);
    });
  });

  describe('Métodos Auxiliares de Conveniencia', () => {
    let showSpy: jest.SpyInstance<void, [Omit<Notification, 'id'>]>;

    beforeEach(() => {
      showSpy = jest.spyOn(service, 'show');
    });

    it('debería invocar show() con tipo CONFIRMATION al usar success()', () => {
      service.success('Éxito', 'Operación completada');

      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CONFIRMATION,
          title: 'Éxito',
          message: 'Operación completada',
          autoDismiss: true
        })
      );
    });

    it('debería invocar show() con tipo INFO al usar info()', () => {
      service.info('Información', 'Detalle relevante');

      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.INFO,
          title: 'Información',
          message: 'Detalle relevante',
          autoDismiss: true
        })
      );
    });

    it('debería invocar show() con tipo ERROR al usar error()', () => {
      service.error('Error', 'Falló la conexión');

      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          title: 'Error',
          message: 'Falló la conexión',
          autoDismiss: true
        })
      );
    });

    it('debería invocar show() con tipo SECURITY al usar security()', () => {
      service.security('Seguridad', 'Sesión expirada');

      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.SECURITY,
          title: 'Seguridad',
          message: 'Sesión expirada',
          autoDismiss: true
        })
      );
    });
  });

  describe('Lógica de Auto-dismiss (Temporizadores)', () => {
    it('debería auto-descartar una notificación estándar tras 5000ms (DEFAULT_DURATION)', () => {
      service.show(createMockNotificationInput({ type: NotificationType.INFO }));
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(4999);
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(service.notifications()).toHaveLength(0);
    });

    it('debería auto-descartar una notificación de ERROR tras 10000ms (ERROR_DURATION)', () => {
      service.show(createMockNotificationInput({ type: NotificationType.ERROR }));
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(5000); // Mitad del tiempo
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(5000); // Tiempo completo (10000)
      expect(service.notifications()).toHaveLength(0);
    });

    it('debería respetar el tiempo personalizado definido en autoDismissDelay', () => {
      service.show(createMockNotificationInput({
        type: NotificationType.INFO,
        autoDismissDelay: 2500
      }));
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(2500);

      expect(service.notifications()).toHaveLength(0);
    });

    it('no debería auto-descartar la notificación si autoDismiss es false', () => {
      service.show(createMockNotificationInput({
        type: NotificationType.INFO,
        autoDismiss: false
      }));
      expect(service.notifications()).toHaveLength(1);

      // Avanzamos el tiempo masivamente (ej. 30 segundos)
      jest.advanceTimersByTime(30000);

      expect(service.notifications()).toHaveLength(1); // Debe seguir viva
    });
  });
});
