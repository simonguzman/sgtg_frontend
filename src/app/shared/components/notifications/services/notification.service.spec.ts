import { TestBed } from '@angular/core/testing';
import { NotificationService } from './notification.service';
import { Notification, NotificationType } from '../models/notification.model';

describe('NotificationService', () => {
  let service: NotificationService;
  // UUID con formato válido (5 secciones separadas por guiones)
  const mockDefaultUuid = '12345678-1234-1234-1234-123456789012';

  beforeEach(() => {
    // Activamos temporizadores falsos para controlar el paso del tiempo en setTimeout
    jest.useFakeTimers();

    // Mock seguro y tipado para crypto.randomUUID
    if (!window.crypto) {
      Object.defineProperty(window, 'crypto', {
        value: { randomUUID: () => mockDefaultUuid },
        writable: true
      });
    } else {
      jest.spyOn(window.crypto, 'randomUUID').mockReturnValue(mockDefaultUuid);
    }

    TestBed.configureTestingModule({
      providers: [NotificationService]
    });

    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería inicializarse con una lista de notificaciones vacía', () => {
      expect(service.notifications()).toEqual([]);
    });
  });

  describe('Método show()', () => {
    it('debería agregar una notificación a la lista con un ID generado', () => {
      service.show({
        title: 'Título Test',
        message: 'Mensaje Test',
        type: NotificationType.INFO
      });

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
      // Formateado para cumplir estrictamente con `${string}-${string}-${string}-${string}-${string}`
      jest.spyOn(window.crypto, 'randomUUID').mockImplementation(
        () => `00000000-0000-0000-0000-00000000000${counter++}`
      );

      service.show({ title: 'Primera', message: 'Msg 1', type: NotificationType.INFO });
      service.show({ title: 'Segunda', message: 'Msg 2', type: NotificationType.INFO });

      const list = service.notifications();
      expect(list).toHaveLength(2);
      expect(list[0].title).toBe('Segunda');
      expect(list[1].title).toBe('Primera');
    });
  });

  describe('Método dismiss()', () => {
    it('debería eliminar la notificación correspondiente al ID especificado', () => {
      service.show({ title: 'Test 1', message: 'Msg 1', type: NotificationType.INFO });
      expect(service.notifications()).toHaveLength(1);

      service.dismiss(mockDefaultUuid);

      expect(service.notifications()).toHaveLength(0);
    });

    it('no debería modificar la lista si el ID a descartar no existe', () => {
      service.show({ title: 'Test 1', message: 'Msg 1', type: NotificationType.INFO });
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
      expect(showSpy).toHaveBeenCalledWith({
        type: NotificationType.CONFIRMATION,
        title: 'Éxito',
        message: 'Operación completada',
        autoDismiss: true
      });
    });

    it('debería invocar show() con tipo INFO al usar info()', () => {
      service.info('Información', 'Detalle relevante');
      expect(showSpy).toHaveBeenCalledWith({
        type: NotificationType.INFO,
        title: 'Información',
        message: 'Detalle relevante',
        autoDismiss: true
      });
    });

    it('debería invocar show() con tipo ERROR al usar error()', () => {
      service.error('Error', 'Falló la conexión');
      expect(showSpy).toHaveBeenCalledWith({
        type: NotificationType.ERROR,
        title: 'Error',
        message: 'Falló la conexión',
        autoDismiss: true
      });
    });

    it('debería invocar show() con tipo SECURITY al usar security()', () => {
      service.security('Seguridad', 'Sesión expirada');
      expect(showSpy).toHaveBeenCalledWith({
        type: NotificationType.SECURITY,
        title: 'Seguridad',
        message: 'Sesión expirada',
        autoDismiss: true
      });
    });
  });

  describe('Lógica de Auto-dismiss (Temporizadores)', () => {
    it('debería auto-descartar una notificación estándar tras 5000ms (DEFAULT_DURATION)', () => {
      service.show({ title: 'Info', message: 'Msg', type: NotificationType.INFO });
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(4999);
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(service.notifications()).toHaveLength(0);
    });

    it('debería auto-descartar una notificación de ERROR tras 10000ms (ERROR_DURATION)', () => {
      service.show({ title: 'Error', message: 'Msg', type: NotificationType.ERROR });
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(5000);
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(5000);
      expect(service.notifications()).toHaveLength(0);
    });

    it('debería respetar el tiempo personalizado definido en autoDismissDelay', () => {
      service.show({
        title: 'Custom',
        message: 'Msg',
        type: NotificationType.INFO,
        autoDismissDelay: 2500
      });
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(2500);
      expect(service.notifications()).toHaveLength(0);
    });

    it('no debería auto-descartar la notificación si autoDismiss es false', () => {
      service.show({
        title: 'Persistente',
        message: 'Msg',
        type: NotificationType.INFO,
        autoDismiss: false
      });
      expect(service.notifications()).toHaveLength(1);

      jest.advanceTimersByTime(30000);

      expect(service.notifications()).toHaveLength(1);
    });
  });
});
