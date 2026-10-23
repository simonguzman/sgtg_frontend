import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ReviewPazYSalvoFacadeService } from './review-paz-y-salvo-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

describe('ReviewPazYSalvoFacadeService', () => {
  let facade: ReviewPazYSalvoFacadeService;
  let thesisWorkService: { getThesisWorkById: jest.Mock; reviewPazYSalvo: jest.Mock };
  let downloadService: { download: jest.Mock };
  let notification: { show: jest.Mock };

  beforeEach(() => {
    thesisWorkService = { getThesisWorkById: jest.fn(), reviewPazYSalvo: jest.fn() };
    downloadService = { download: jest.fn().mockResolvedValue(undefined) };
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: ThesisWorkService, useValue: thesisWorkService },
        { provide: FileDownloadService, useValue: downloadService },
        { provide: NotificationService, useValue: notification }
      ]
    });
    facade = TestBed.inject(ReviewPazYSalvoFacadeService);
  });

  it('carga el trabajo o avisa que no existe', () => {
    const onSuccess = jest.fn();
    const onError = jest.fn();
    thesisWorkService.getThesisWorkById.mockReturnValue(of(thesisWorkDePrueba()));
    facade.loadThesisWork('15', onSuccess, onError);
    thesisWorkService.getThesisWorkById.mockReturnValue(of(undefined));
    facade.loadThesisWork('99', onSuccess, onError);

    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'No encontrado' }));
  });

  it.each([
    [true, '', 'Paz y salvo aprobado'],
    [false, 'Deuda en biblioteca', 'Paz y salvo no aprobado']
  ])('registra la revisión (aprobado: %s)', (approved, observations, titulo) => {
    thesisWorkService.reviewPazYSalvo.mockReturnValue(of(thesisWorkDePrueba()));
    const archivo = pdf('f.pdf');
    const onSuccess = jest.fn();

    facade.processPazYSalvo('15', { approved, observations }, archivo, onSuccess, jest.fn());

    expect(thesisWorkService.reviewPazYSalvo).toHaveBeenCalledWith('15', approved, observations, archivo);
    expect(onSuccess).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      title: titulo, type: NotificationType.CONFIRMATION
    }));
  });

  it('muestra el mensaje del backend si rechaza la revisión', () => {
    thesisWorkService.reviewPazYSalvo.mockReturnValue(throwError(() => new HttpErrorResponse({
      status: 400, error: { message: 'Si el paz y salvo no se aprueba, las observaciones son obligatorias.' }
    })));
    const onError = jest.fn();

    facade.processPazYSalvo('15', { approved: false, observations: 'x' }, pdf('f.pdf'), jest.fn(), onError);

    expect(onError).toHaveBeenCalled();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({
      type: NotificationType.ERROR, message: 'Si el paz y salvo no se aprueba, las observaciones son obligatorias.'
    }));
  });

  it('descarga el documento o avisa si no tiene URL', async () => {
    const documento: FileDocument = { id: 'm', name: 'Monografía', url: '/m', uploadDate: '2026-07-01',
      type: DocumentType.MONOGRAFIA };

    await facade.downloadDocument(documento);
    await facade.downloadDocument({ ...documento, url: '' });

    expect(downloadService.download).toHaveBeenCalledTimes(1);
    expect(downloadService.download).toHaveBeenCalledWith('/m', 'Monografía.pdf');
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
  });

  it('showNavigationError avisa del error de navegación', () => {
    facade.showNavigationError();
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de navegación' }));
  });
});
