import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EvaluateCorrectionsFacadeService } from './evaluate-corrections-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

describe('EvaluateCorrectionsFacadeService', () => {
  let facade: EvaluateCorrectionsFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; verifyAdjustments: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), verifyAdjustments: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(EvaluateCorrectionsFacadeService);
  });

  it('carga el trabajo o informa el error', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onError);
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it.each([
    [true, 'Los ajustes cumplen: la sustentación quedó aprobada.'],
    [false, 'Los ajustes no cumplen: la sustentación se aplazó.']
  ])('registra la verificación (cumple: %s)', (fulfills, mensaje) => {
    thesisWorkService.verifyAdjustments.mockReturnValue(of(thesisWorkDePrueba()));
    const onSuccess = jest.fn();
    facade.saveEvaluation('15', { fulfills, observations: 'Obs' }, onSuccess, jest.fn());
    expect(thesisWorkService.verifyAdjustments).toHaveBeenCalledWith('15', fulfills, 'Obs');
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ message: mensaje }));
  });

  it('muestra el mensaje del backend si la rechaza', () => {
    thesisWorkService.verifyAdjustments.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 406, error: { message: 'Solo el jurado coordinador verifica los ajustes.' }
    })));
    const onError = jest.fn();
    facade.saveEvaluation('15', { fulfills: true, observations: '' }, jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Solo el jurado coordinador verifica los ajustes.', type: NotificationType.ERROR
    }));
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
