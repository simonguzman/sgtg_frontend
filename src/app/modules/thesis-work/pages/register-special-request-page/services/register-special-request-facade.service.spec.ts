import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterSpecialRequestFacadeService } from './register-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('RegisterSpecialRequestFacadeService', () => {
  let facade: RegisterSpecialRequestFacadeService;
  let thesisWorkService: { getThesisWorkById: jest.Mock; createSpecialRequest: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    thesisWorkService = { getThesisWorkById: jest.fn(), createSpecialRequest: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(RegisterSpecialRequestFacadeService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('loadThesisWork', () => {
    it('entrega el trabajo encontrado', () => {
      const thesis = thesisWorkDePrueba();
      thesisWorkService.getThesisWorkById.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.loadThesisWork('15', onSuccess, jest.fn(), jest.fn());
      expect(onSuccess).toHaveBeenCalledWith(thesis);
    });

    it('distingue "no encontrado" del error de conexión', () => {
      const onNotFound = jest.fn();
      const onError = jest.fn();
      thesisWorkService.getThesisWorkById.mockReturnValue(of(undefined));
      facade.loadThesisWork('99', jest.fn(), onNotFound, onError);
      thesisWorkService.getThesisWorkById.mockReturnValue(throwError(() => new Error('x')));
      facade.loadThesisWork('15', jest.fn(), onNotFound, onError);
      expect(onNotFound).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
    });
  });

  describe('processSaveRequest', () => {
    it('registra la solicitud y avisa que irá al Consejo', () => {
      const solicitud = { requestType: SpecialRequestType.SUSPENSION as const, document: pdf('s.pdf') };
      thesisWorkService.createSpecialRequest.mockReturnValue(of(thesisWorkDePrueba()));
      const onSuccess = jest.fn();
      facade.processSaveRequest('15', solicitud, onSuccess, jest.fn());

      expect(thesisWorkService.createSpecialRequest).toHaveBeenCalledWith('15', solicitud);
      expect(onSuccess).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'La solicitud quedó registrada y se notificó al Consejo de Facultad.'
      }));
    });

    it('la reanudación confirma que el trabajo se reanudó', () => {
      thesisWorkService.createSpecialRequest.mockReturnValue(of(thesisWorkDePrueba()));
      facade.processSaveRequest('15', { requestType: SpecialRequestType.REANUDACION, document: pdf('r.pdf') },
        jest.fn(), jest.fn());
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'El trabajo de grado se reanudó correctamente.'
      }));
    });

    it('muestra el mensaje del backend si la rechaza', () => {
      thesisWorkService.createSpecialRequest.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { message: 'La prórroga ya fue solicitada' }
      })));
      const onError = jest.fn();
      facade.processSaveRequest('15', { requestType: SpecialRequestType.PRORROGA, months: 1, document: pdf('p.pdf') },
        jest.fn(), onError);

      expect(onError).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'La prórroga ya fue solicitada', type: NotificationType.ERROR
      }));
    });
  });
});
