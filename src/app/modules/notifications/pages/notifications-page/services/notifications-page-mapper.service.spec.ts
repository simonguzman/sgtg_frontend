import { TestBed } from '@angular/core/testing';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { InboxMessage } from '../../../interfaces/inbox-message.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import * as dateHelper from '../../../helpers/inbox-date.helper';

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-default',
  type: NotificationType.INFO,
  title: 'Título por defecto',
  message: 'Cuerpo del mensaje',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

describe('NotificationsPageMapperService', () => {
  let service: NotificationsPageMapperService;
  let formatInboxDateSpy: jest.SpyInstance;
  const mockDate = new Date(2026, 7, 10, 12, 0, 0);
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [NotificationsPageMapperService]
    });
    service = TestBed.inject(NotificationsPageMapperService);
    formatInboxDateSpy = jest.spyOn(dateHelper, 'formatInboxDate')
      .mockReturnValue('10 de agosto, 12:00 PM');
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('mapMessageToRow', () => {
    it('debe mapear correctamente un mensaje "no leido" conservando sus propiedades originales', () => {
      const mockMessage = createMockInboxMessage({
        id: 'msg-123',
        title: 'Nueva propuesta asignada',
        message: 'Tienes una propuesta pendiente de revisión',
        status: 'no leido',
        date: mockDate,
        userId: 'user-1'
      });
      const result = service.mapMessageToRow(mockMessage);
      expect(formatInboxDateSpy).toHaveBeenCalledWith(mockDate);
      expect(formatInboxDateSpy).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        ...mockMessage,
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
      expect(result.stateLabel).toBe('Leído');
      expect(result.dateFormatted).toBe('10 de agosto, 12:00 PM');
      expect(result.allowedActions).toEqual(['ver_detalle', 'eliminar']);
    });
  });
});
