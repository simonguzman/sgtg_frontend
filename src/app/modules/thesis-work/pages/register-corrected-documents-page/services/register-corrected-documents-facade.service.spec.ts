import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { RegisterCorrectedDocumentsFacadeService } from './register-corrected-documents-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('RegisterCorrectedDocumentsFacadeService', () => {
  let facade: RegisterCorrectedDocumentsFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; submitAdjustments: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), submitAdjustments: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(RegisterCorrectedDocumentsFacadeService);
  });

  it('carga el trabajo o informa el error', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('x')));
    facade.loadThesisWork('15', onSuccess, onError);
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it('radica los ajustes con anexos opcionales', () => {
    const ajustes = pdf('ajustes.pdf');
    thesisWorkService.submitAdjustments.mockReturnValue(of(thesisWorkDePrueba()));
    const onSuccess = jest.fn();
    facade.processCorrectedDocuments('15', { monograph: ajustes, annexes: null }, onSuccess, jest.fn());
    expect(thesisWorkService.submitAdjustments).toHaveBeenCalledWith('15', ajustes, null);
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Ajustes radicados' }));
  });

  it('muestra el mensaje del backend si los rechaza', () => {
    thesisWorkService.submitAdjustments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Los ajustes debían radicarse dentro de los 10 días hábiles.' }
    })));
    const onError = jest.fn();
    facade.processCorrectedDocuments('15', { monograph: pdf('a.pdf'), annexes: null }, jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Los ajustes debían radicarse dentro de los 10 días hábiles.', type: NotificationType.ERROR
    }));
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
