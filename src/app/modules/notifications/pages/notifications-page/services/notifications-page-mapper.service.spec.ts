import { TestBed } from '@angular/core/testing';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { InboxMessage } from '../../../interfaces/inbox-message.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// Importamos el helper como un módulo para poder espiarlo
import * as dateHelper from '../../../helpers/inbox-date.helper';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-default',
  type: NotificationType.INFO, // Asumimos un tipo por defecto válido
  title: 'Título por defecto',
  message: 'Cuerpo del mensaje',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('NotificationsPageMapperService', () => {
  let service: NotificationsPageMapperService;
  let formatInboxDateSpy: jest.SpyInstance;

  // Fecha fija para evitar problemas de zonas horarias en los tests
  const mockDate = new Date(2026, 7, 10, 12, 0, 0); // 10 de Agosto de 2026, 12:00 PM (Mes 7 = Agosto)

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [NotificationsPageMapperService]
    });

    service = TestBed.inject(NotificationsPageMapperService);

    // Interceptamos el helper para que devuelva un string estático y predecible.
    // Esto aísla nuestra prueba de la lógica interna de formateo de fechas.
    formatInboxDateSpy = jest.spyOn(dateHelper, 'formatInboxDate')
      .mockReturnValue('10 de agosto, 12:00 PM');
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar todos los espías
  });

  describe('mapMessageToRow', () => {
    it('debe mapear correctamente un mensaje "no leido" conservando sus propiedades originales', () => {
      // 🔹 REFACTOR: Usamos la fábrica pura en lugar de castear un objeto incompleto
      const mockMessage = createMockInboxMessage({
        id: 'msg-123',
        title: 'Nueva propuesta asignada',
        message: 'Tienes una propuesta pendiente de revisión',
        status: 'no leido',
        date: mockDate,
        userId: 'user-1'
      });

      const result = service.mapMessageToRow(mockMessage);

      // Verificamos que se haya delegado el formateo de fecha al helper correcto
      expect(formatInboxDateSpy).toHaveBeenCalledWith(mockDate);
      expect(formatInboxDateSpy).toHaveBeenCalledTimes(1);

      // Verificamos la transformación completa
      expect(result).toEqual({
        ...mockMessage, // Se asegura de que no se pierda ninguna propiedad original (id, type, userId, etc.)
        stateLabel: 'No Leído',
        dateFormatted: '10 de agosto, 12:00 PM',
        allowedActions: ['ver_detalle', 'eliminar']
      });
    });

    it('debe mapear correctamente el estado a "Leído" cuando el status es "leido"', () => {
      const mockMessage = createMockInboxMessage({
        id: 'msg-456',
        status: 'leido',
        date: mockDate
      });

      const result = service.mapMessageToRow(mockMessage);

      // Verificamos específicamente la rama condicional del operador ternario
      expect(result.stateLabel).toBe('Leído');
      expect(result.dateFormatted).toBe('10 de agosto, 12:00 PM');
      expect(result.allowedActions).toEqual(['ver_detalle', 'eliminar']);
    });
  });
});
