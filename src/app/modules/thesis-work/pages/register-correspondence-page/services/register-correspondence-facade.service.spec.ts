import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterCorrespondenceFacadeService } from './register-correspondence-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('RegisterCorrespondenceFacadeService (versión definitiva)', () => {
  let facade: RegisterCorrespondenceFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; uploadFinalVersion: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), uploadFinalVersion: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(RegisterCorrespondenceFacadeService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('carga el trabajo o informa el error', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onError);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('x')));
    facade.loadThesisWork('15', onSuccess, onError);
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it('carga la versión definitiva y confirma que el trabajo finalizó', () => {
    const definitiva = pdf('definitiva.pdf');
    thesisWorkService.uploadFinalVersion.mockReturnValue(of(thesisWorkDePrueba()));
    const onSuccess = jest.fn();
    facade.processCorrespondence('15', definitiva, onSuccess, jest.fn());
    expect(thesisWorkService.uploadFinalVersion).toHaveBeenCalledWith('15', definitiva);
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: '¡Trabajo de grado finalizado!', type: NotificationType.CONFIRMATION
    }));
  });

  it('muestra el mensaje del backend si la rechaza', () => {
    thesisWorkService.uploadFinalVersion.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'La versión definitiva solo se carga cuando la sustentación está aprobada.' }
    })));
    const onError = jest.fn();
    facade.processCorrespondence('15', pdf('d.pdf'), jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'La versión definitiva solo se carga cuando la sustentación está aprobada.'
    }));
  });

  it('showNavigationError avisa del identificador faltante', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Identificador faltante' }));
  });
});
