import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { EvaluateSpecialRequestFacadeService } from './evaluate-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';

describe('EvaluateSpecialRequestFacadeService', () => {
  let service: EvaluateSpecialRequestFacadeService;
  let thesisWorkServiceMock: jest.Mocked<ThesisWorkService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  // Uso seguro de tipado parcial para los mocks en lugar de any
  const mockRequest = {
    id: 'req-1'
  } as Partial<SpecialRequest> as SpecialRequest;

  const mockThesisWork = {
    thesisWorkId: 'thesis-1',
    specialRequests: [mockRequest]
  } as Partial<ThesisWork> as ThesisWork;

  beforeEach(() => {
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      evaluateSpecialRequestMock: jest.fn()
    } as Partial<ThesisWorkService> as jest.Mocked<ThesisWorkService>;

    notificationServiceMock = {
      show: jest.fn()
    } as Partial<NotificationService> as jest.Mocked<NotificationService>;

    TestBed.configureTestingModule({
      providers: [
        EvaluateSpecialRequestFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(EvaluateSpecialRequestFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadThesisWorkAndRequest', () => {
    it('debería llamar a onSuccess cuando el trabajo y la solicitud existen', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesisWork, mockRequest);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError si la data retorna undefined (comportamiento corregido)', () => {
      // CORRECCIÓN: Para forzar undefined en TypeScript estricto sin usar 'any',
      // primero se debe pasar por 'unknown'.
      const emptyResponse = undefined as unknown as ThesisWork;
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(emptyResponse));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'El trabajo de grado especificado no existe.'
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError si la solicitud específica no se encuentra', () => {
      const workSinRequest = {
        thesisWorkId: 'thesis-1',
        specialRequests: []
      } as Partial<ThesisWork> as ThesisWork;

      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(workSinRequest));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-999', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'No se encontró la solicitud especial especificada.'
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError cuando la petición falla', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          message: 'No se pudo recuperar la información del proyecto.'
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('processEvaluation', () => {
    const payload = { status: stateList.APROBADO as const, resolutionDetails: 'Ok' };

    it('debería notificar éxito y llamar a onSuccess', () => {
      thesisWorkServiceMock.evaluateSpecialRequestMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('thesis-1', 'req-1', payload, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.evaluateSpecialRequestMock).toHaveBeenCalledWith('thesis-1', 'req-1', payload);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.CONFIRMATION,
          title: 'Evaluación Registrada'
        })
      );
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error y llamar a onError cuando falla', () => {
      thesisWorkServiceMock.evaluateSpecialRequestMock.mockReturnValue(throwError(() => new Error('Server error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('thesis-1', 'req-1', payload, onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.ERROR,
          title: 'Error de Red'
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
