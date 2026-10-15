import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { UploadFinalDeliveryFacadeService } from './upload-final-delivery-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('UploadFinalDeliveryFacadeService', () => {
  let facade: UploadFinalDeliveryFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; requestSustentation: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), requestSustentation: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(UploadFinalDeliveryFacadeService);
  });

  it('carga el trabajo o avisa si no existe o falla', () => {
    const thesis = thesisWorkDePrueba();
    const onSuccess = jest.fn();
    const onNotFound = jest.fn();
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesis));
    facade.loadThesisWork('15', onSuccess, onNotFound);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onNotFound);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('x')));
    facade.loadThesisWork('15', onSuccess, onNotFound);
    expect(onSuccess).toHaveBeenCalledWith(thesis);
    expect(onNotFound).toHaveBeenCalledTimes(2);
  });

  it('solicita la sustentación con los documentos y confirma', () => {
    const files = { monograph: pdf('m.pdf'), formatE: pdf('e.pdf'), pazYSalvo: pdf('f.pdf') };
    thesisWorkService.requestSustentation.mockReturnValue(of(thesisWorkDePrueba()));
    const onSuccess = jest.fn();
    facade.processFinalDelivery('15', files, onSuccess, jest.fn());

    expect(thesisWorkService.requestSustentation).toHaveBeenCalledWith('15', files);
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Sustentación solicitada', type: NotificationType.CONFIRMATION
    }));
  });

  it('muestra el mensaje del backend si la rechaza', () => {
    thesisWorkService.requestSustentation.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'La sustentación solo puede solicitarse después de los meses mínimos.' }
    })));
    const onError = jest.fn();
    facade.processFinalDelivery('15', { monograph: pdf('m.pdf'), formatE: pdf('e.pdf'), pazYSalvo: pdf('f.pdf') },
      jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'La sustentación solo puede solicitarse después de los meses mínimos.', type: NotificationType.ERROR
    }));
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
