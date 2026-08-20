import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SustentationDetailsFacadeService } from './sustentation-details-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { SustentationDetailsMapperService } from './sustentation-details-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// Sustituye con las rutas correctas a tus interfaces
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationDetailsView } from '../models/sustentation-details.model';

describe('SustentationDetailsFacadeService', () => {
  let service: SustentationDetailsFacadeService;
  let thesisWorkSpy: jest.Mocked<ThesisWorkService>;
  let mapperSpy: jest.Mocked<SustentationDetailsMapperService>;
  let downloadSpy: jest.Mocked<FileDownloadService>;
  let notificationSpy: jest.Mocked<NotificationService>;

  beforeEach(() => {
    thesisWorkSpy = { getThesisWorkByIdMock: jest.fn() } as unknown as jest.Mocked<ThesisWorkService>;
    mapperSpy = { mapToView: jest.fn() } as unknown as jest.Mocked<SustentationDetailsMapperService>;
    downloadSpy = { download: jest.fn() } as unknown as jest.Mocked<FileDownloadService>;
    notificationSpy = { show: jest.fn() } as unknown as jest.Mocked<NotificationService>;

    TestBed.configureTestingModule({
      providers: [
        SustentationDetailsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkSpy },
        { provide: SustentationDetailsMapperService, useValue: mapperSpy },
        { provide: FileDownloadService, useValue: downloadSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(SustentationDetailsFacadeService);
  });

  describe('loadDetails', () => {
    const thesisId = 'tw-1';
    const sustentationId = 's-1';
    const mockThesisWork = { id: thesisId } as unknown as ThesisWork;
    const mockView = { title: 'Test Sustentation' } as unknown as SustentationDetailsView;

    it('debe cargar y mapear los detalles exitosamente', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      mapperSpy.mapToView.mockReturnValue(mockView);

      service.loadDetails(thesisId, sustentationId);

      expect(thesisWorkSpy.getThesisWorkByIdMock).toHaveBeenCalledWith(thesisId);
      expect(mapperSpy.mapToView).toHaveBeenCalledWith(mockThesisWork, sustentationId);
      expect(service.viewData()).toEqual(mockView);
      expect(service.isLoading()).toBe(false);
    });

    it('debe mostrar error si el trabajo se encuentra pero la sustentación no (mapper retorna null)', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      mapperSpy.mapToView.mockReturnValue(null);

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'Sustentación no encontrada en el registro.',
        type: NotificationType.ERROR
      });
      expect(service.viewData()).toBeNull();
      expect(service.isLoading()).toBe(false);
    });

    it('debe mostrar error si el trabajo no se encuentra (retorna null/undefined)', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(null as unknown as ThesisWork));

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'Trabajo no registrado.',
        type: NotificationType.ERROR
      });
      expect(service.isLoading()).toBe(false);
    });

    it('debe manejar errores de comunicación (catch error)', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network error')));

      service.loadDetails(thesisId, sustentationId);

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Error de comunicación.',
        type: NotificationType.ERROR
      });
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('downloadDocument', () => {
    it('debe llamar al servicio de descarga con nombre por defecto si no se provee', () => {
      service.downloadDocument('http://test.com/doc.pdf');
      expect(downloadSpy.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'documento');
    });

    it('debe llamar al servicio de descarga con el nombre proveído', () => {
      service.downloadDocument('http://test.com/doc.pdf', 'mi-archivo.pdf');
      expect(downloadSpy.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'mi-archivo.pdf');
    });

    it('debe mostrar error si no hay url', () => {
      service.downloadDocument(undefined);
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        message: 'Documento no encontrado o ruta inválida.'
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });
  });
});
