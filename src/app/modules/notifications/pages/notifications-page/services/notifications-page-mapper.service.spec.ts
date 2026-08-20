import { TestBed } from '@angular/core/testing';
import { NotificationsPageMapperService } from './notifications-page-mapper.service';
import { InboxMessage } from '../../../interfaces/inbox-message.interface';

// Importamos el helper como un módulo para poder espiarlo
import * as dateHelper from '../../../helpers/inbox-date.helper';

describe('NotificationsPageMapperService', () => {
  let service: NotificationsPageMapperService;
  let formatInboxDateSpy: jest.SpyInstance;

  // Fecha fija para evitar problemas de zonas horarias en los tests
  const mockDate = new Date('2026-08-10T12:00:00Z');

  beforeEach(() => {
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
    jest.restoreAllMocks();
  });

  describe('mapMessageToRow', () => {
    it('debe mapear correctamente un mensaje "no leido" conservando sus propiedades originales', () => {
      // Usamos 'as InboxMessage' simulando solo los campos necesarios para evitar el uso de 'any'
      const mockMessage = {
        id: 'msg-123',
        title: 'Nueva propuesta asignada',
        message: 'Tienes una propuesta pendiente de revisión',
        status: 'no leido',
        date: mockDate,
        userId: 'user-1'
      } as InboxMessage;

      const result = service.mapMessageToRow(mockMessage);

      // Verificamos que se haya delegado el formateo de fecha al helper correcto
      expect(formatInboxDateSpy).toHaveBeenCalledWith(mockDate);
      expect(formatInboxDateSpy).toHaveBeenCalledTimes(1);

      // Verificamos la transformación completa
      expect(result).toEqual({
        id: 'msg-123',
        title: 'Nueva propuesta asignada',
        message: 'Tienes una propuesta pendiente de revisión',
        status: 'no leido',
        date: mockDate,
        userId: 'user-1',
        // Propiedades calculadas por el mapper:
        stateLabel: 'No Leído',
        dateFormatted: '10 de agosto, 12:00 PM',
        allowedActions: ['ver_detalle', 'eliminar']
      });
    });

    it('debe mapear correctamente el estado a "Leído" cuando el status es "leido"', () => {
      const mockMessage = {
        id: 'msg-456',
        status: 'leido',
        date: mockDate
      } as InboxMessage;

      const result = service.mapMessageToRow(mockMessage);

      // Verificamos específicamente la rama condicional del operador ternario
      expect(result.stateLabel).toBe('Leído');
      expect(result.allowedActions).toEqual(['ver_detalle', 'eliminar']);
    });
  });
});
