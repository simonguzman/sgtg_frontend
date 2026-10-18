import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EvaluateAdvanceFacadeService } from './evaluate-advance-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoEnCursoCon, informeDePrueba } from '../../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('EvaluateAdvanceFacadeService', () => {
  let facade: EvaluateAdvanceFacadeService;
  let thesisWorkService: { getThesisWorkById: jest.Mock; revisarInforme: jest.Mock };
  let download: { download: jest.Mock };
  let notification: { show: jest.Mock };

  const thesis = thesisWorkDePrueba(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1)] }));

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    thesisWorkService = { getThesisWorkById: jest.fn(), revisarInforme: jest.fn() };
    download = { download: jest.fn().mockResolvedValue(undefined) };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: FileDownloadService, useValue: download },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(EvaluateAdvanceFacadeService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('loadThesisWork', () => {
    it('entrega el trabajo encontrado', () => {
      thesisWorkService.getThesisWorkById.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.loadThesisWork('15', onSuccess, jest.fn());
      expect(onSuccess).toHaveBeenCalledWith(thesis);
    });

    it('avisa si no existe o falla la consulta', () => {
      const onError = jest.fn();
      thesisWorkService.getThesisWorkById.mockReturnValue(of(undefined));
      facade.loadThesisWork('99', jest.fn(), onError);
      thesisWorkService.getThesisWorkById.mockReturnValue(throwError(() => new Error('x')));
      facade.loadThesisWork('15', jest.fn(), onError);
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('saveEvaluation', () => {
    it('registra la revisión del informe y confirma', () => {
      const notas = pdf('notas.pdf');
      thesisWorkService.revisarInforme.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.saveEvaluation(thesis, thesis.advances![0], { comments: 'Bien', notes: notas }, onSuccess, jest.fn());

      expect(thesisWorkService.revisarInforme).toHaveBeenCalledWith('15', '1', 'Bien', notas);
      expect(onSuccess).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Revisión registrada' }));
    });

    it('muestra el mensaje del backend si la rechaza', () => {
      thesisWorkService.revisarInforme.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { message: 'Ya registró una revisión de este informe mensual.' }
      })));
      const onError = jest.fn();
      facade.saveEvaluation(thesis, thesis.advances![0], { comments: 'Otra', notes: null }, jest.fn(), onError);

      expect(onError).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Ya registró una revisión de este informe mensual.', type: NotificationType.ERROR
      }));
    });
  });

  describe('downloadAdvance', () => {
    it('descarga el PDF con su nombre', async () => {
      await facade.downloadAdvance({ name: 'informe-1', url: '/api/x' });
      expect(download.download).toHaveBeenCalledWith('/api/x', 'informe-1.pdf');
    });

    it('sin URL avisa y no descarga', async () => {
      await facade.downloadAdvance({ name: 'x', url: '' });
      expect(download.download).not.toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
    });

    it('si la descarga falla, avisa', async () => {
      download.download.mockRejectedValue(new Error('red'));
      await facade.downloadAdvance({ name: 'x', url: '/api/x' });
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
    });
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
