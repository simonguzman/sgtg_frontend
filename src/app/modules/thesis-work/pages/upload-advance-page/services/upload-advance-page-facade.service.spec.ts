import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { UploadAdvancePageFacadeService } from './upload-advance-page-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('UploadAdvancePageFacadeService', () => {
  let facade: UploadAdvancePageFacadeService;
  let thesisWorkService: { getThesisWorkById: jest.Mock; radicarInforme: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = { getThesisWorkById: jest.fn(), radicarInforme: jest.fn() };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(UploadAdvancePageFacadeService);
  });

  describe('loadThesisWork', () => {
    it('entrega el trabajo encontrado', () => {
      const thesis = thesisWorkDePrueba();
      thesisWorkService.getThesisWorkById.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.loadThesisWork('15', onSuccess, jest.fn());
      expect(onSuccess).toHaveBeenCalledWith(thesis);
    });

    it('avisa y regresa si no existe', () => {
      thesisWorkService.getThesisWorkById.mockReturnValue(of(undefined));
      const onNotFound = jest.fn();
      facade.loadThesisWork('99', jest.fn(), onNotFound);
      expect(onNotFound).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'No encontrado' }));
    });

    it('avisa y regresa si falla la consulta', () => {
      thesisWorkService.getThesisWorkById.mockReturnValue(throwError(() => new Error('x')));
      const onNotFound = jest.fn();
      facade.loadThesisWork('15', jest.fn(), onNotFound);
      expect(onNotFound).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });

  describe('processAdvance', () => {
    it('radica el informe con sus observaciones y confirma', () => {
      const informe = pdf('informe.pdf');
      thesisWorkService.radicarInforme.mockReturnValue(of(thesisWorkDePrueba()));
      const onSuccess = jest.fn();
      facade.processAdvance('15', { comments: 'Primer mes', file: informe }, onSuccess, jest.fn());

      expect(thesisWorkService.radicarInforme).toHaveBeenCalledWith('15', informe, 'Primer mes');
      expect(onSuccess).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Informe radicado', type: NotificationType.CONFIRMATION
      }));
    });

    it('muestra el mensaje del backend si lo rechaza', () => {
      thesisWorkService.radicarInforme.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 406, error: { message: 'Los informes mensuales los radican los estudiantes del trabajo' }
      })));
      const onError = jest.fn();
      facade.processAdvance('15', { comments: '', file: pdf('i.pdf') }, jest.fn(), onError);

      expect(onError).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Los informes mensuales los radican los estudiantes del trabajo', type: NotificationType.ERROR
      }));
    });
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
