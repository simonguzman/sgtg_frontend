import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EvaluateSustentationFacadeService } from './evaluate-sustentation-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { INASISTENCIA } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('EvaluateSustentationFacadeService', () => {
  let facade: EvaluateSustentationFacadeService;
  let thesisWorkService: Record<string, jest.Mock>;
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = {
      getThesisWorkById: jest.fn(),
      gradeSustentation: jest.fn().mockReturnValue(of(thesisWorkDePrueba())),
      registerNonAttendance: jest.fn().mockReturnValue(of(thesisWorkDePrueba()))
    };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: FileDownloadService, useValue: { download: jest.fn() } },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(EvaluateSustentationFacadeService);
  });

  it('carga el trabajo o informa el error', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService['getThesisWorkById'].mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService['getThesisWorkById'].mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onError);
    expect(onSuccess).toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
  });

  it.each([
    [stateList.APROBADO, 'APROBADO', 'Sustentación Evaluada'],
    [stateList.APROBADO_CON_OBSERVACIONES, 'APROBADO_CON_OBSERVACIONES', 'Sustentación Evaluada'],
    [stateList.APLAZADO, 'APLAZADO', 'Sustentación Aplazada'],
    [stateList.NO_APROBADO, 'NO_APROBADO', 'Sustentación No Aprobada']
  ] as const)('la calificación %s se envía como %s con el acta', (veredict, calificacion, titulo) => {
    const acta = pdf('acta.pdf');
    const onSuccess = jest.fn();
    facade.processEvaluation('15', { veredict, observations: 'Obs', evaluationDate: new Date() }, acta, onSuccess,
      jest.fn());
    expect(thesisWorkService['gradeSustentation']).toHaveBeenCalledWith('15', calificacion, 'Obs', acta);
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: titulo }));
  });

  it('la inasistencia se registra sin acta', () => {
    facade.processEvaluation('15', { veredict: INASISTENCIA, observations: 'No se presentó', evaluationDate: new Date() },
      null, jest.fn(), jest.fn());
    expect(thesisWorkService['registerNonAttendance']).toHaveBeenCalledWith('15', 'No se presentó');
    expect(thesisWorkService['gradeSustentation']).not.toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Inasistencia registrada' }));
  });

  it('muestra el mensaje del backend si la rechaza', () => {
    thesisWorkService['gradeSustentation'].mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 406, error: { message: 'Solo el jurado coordinador de la sesión registra la calificación.' }
    })));
    const onError = jest.fn();
    facade.processEvaluation('15', { veredict: stateList.APROBADO, observations: '', evaluationDate: new Date() },
      pdf('a.pdf'), jest.fn(), onError);
    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      message: 'Solo el jurado coordinador de la sesión registra la calificación.', type: NotificationType.ERROR
    }));
  });
});
