import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { EvaluateSpecialRequestFacadeService } from './evaluate-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoEnCursoCon } from '../../../../../testing/trabajo-grado-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('EvaluateSpecialRequestFacadeService', () => {
  let facade: EvaluateSpecialRequestFacadeService;
  let thesisWorkService: { getThesisWorkByIdMock: jest.Mock; evaluateSpecialRequest: jest.Mock };
  let download: { download: jest.Mock };
  let notification: { show: jest.Mock };

  const thesis = thesisWorkDePrueba(crearTrabajoEnCursoCon({
    prorroga: { meses: 2, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/p.pdf', fechaSolicitud: '2026-11-01', decision: null }
  }));
  const decision = { status: stateList.APROBADO as const, resolutionDetails: '', resolution: pdf('r.pdf') };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    thesisWorkService = { getThesisWorkByIdMock: jest.fn(), evaluateSpecialRequest: jest.fn() };
    download = { download: jest.fn().mockResolvedValue(undefined) };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: FileDownloadService, useValue: download },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(EvaluateSpecialRequestFacadeService);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('loadThesisWorkAndRequest', () => {
    it('entrega el trabajo y la solicitud', () => {
      thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.loadThesisWorkAndRequest('15', 'prorroga-0', onSuccess, jest.fn());
      expect(onSuccess).toHaveBeenCalledWith(thesis, thesis.specialRequests[0]);
    });

    it('avisa si la solicitud no existe', () => {
      thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(thesis));
      const onError = jest.fn();
      facade.loadThesisWorkAndRequest('15', 'suspension-0', jest.fn(), onError);
      expect(onError).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
        message: 'No se encontró la solicitud especificada.'
      }));
    });

    it('avisa si el trabajo no existe o falla la consulta', () => {
      const onError = jest.fn();
      thesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(undefined));
      facade.loadThesisWorkAndRequest('99', 'x', jest.fn(), onError);
      thesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('x')));
      facade.loadThesisWorkAndRequest('15', 'x', jest.fn(), onError);
      expect(onError).toHaveBeenCalledTimes(2);
    });
  });

  describe('processEvaluation', () => {
    it('registra la decisión y confirma', () => {
      thesisWorkService.evaluateSpecialRequest.mockReturnValue(of(thesis));
      const onSuccess = jest.fn();
      facade.processEvaluation('15', thesis.specialRequests[0], decision, onSuccess, jest.fn());

      expect(thesisWorkService.evaluateSpecialRequest).toHaveBeenCalledWith('15', thesis.specialRequests[0], decision);
      expect(onSuccess).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.CONFIRMATION }));
    });

    it('muestra el mensaje del backend si la rechaza', () => {
      thesisWorkService.evaluateSpecialRequest.mockReturnValue(throwError(() => new HttpErrorResponse({
        status: 400, error: { message: 'La resolución es obligatoria' }
      })));
      const onError = jest.fn();
      facade.processEvaluation('15', thesis.specialRequests[0], decision, jest.fn(), onError);

      expect(onError).toHaveBeenCalled();
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ message: 'La resolución es obligatoria' }));
    });
  });

  describe('downloadDocument', () => {
    it('descarga el documento de la solicitud', async () => {
      const documento = thesis.specialRequests[0].documents![0];
      await facade.downloadDocument(documento);
      expect(download.download).toHaveBeenCalledWith(documento.url, 'p.pdf');
    });

    it('si la descarga falla, avisa', async () => {
      download.download.mockRejectedValue(new Error('red'));
      await facade.downloadDocument(thesis.specialRequests[0].documents![0]);
      expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });
});
