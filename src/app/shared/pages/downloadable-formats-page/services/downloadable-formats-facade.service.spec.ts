import { TestBed } from '@angular/core/testing';
import { DownloadableFormatsFacadeService } from './downloadable-formats-facade.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { DownloadableFormat } from '../models/downloadable-formats-page.model';

const createMockDownloadableFormat = (overrides: Partial<DownloadableFormat> = {}): DownloadableFormat => ({
  id: 'f-01',
  title: 'Formato de Prueba',
  url: 'http://midominio.com/formato.pdf',
  ...overrides
});

describe('DownloadableFormatsFacadeService', () => {
  let facade: DownloadableFormatsFacadeService;

  let mockDownloadService: {
    download: jest.Mock<Promise<void>, [string, string, boolean]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockDownloadService = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        DownloadableFormatsFacadeService,
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    facade = TestBed.inject(DownloadableFormatsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('downloadFormat()', () => {
    it('debería mostrar notificación de error y detenerse si la URL es inválida (vacía o solo espacios)', async () => {
      const mockFormat = createMockDownloadableFormat({ url: '   ' });
      await facade.downloadFormat(mockFormat);
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'La ruta del archivo no es válida o está vacía.',
        type: NotificationType.ERROR
      });
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería notificar el inicio de descarga y llamar al FileDownloadService con la URL, nombre en mayúsculas y flag de uso de blob en true', async () => {
      const mockFormat = createMockDownloadableFormat({
        id: 'f-01',
        title: 'Formato de Prueba',
        url: 'http://midominio.com/formato.pdf'
      });
      await facade.downloadFormat(mockFormat);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Descarga en curso',
        message: 'Iniciando la descarga del F-01. Revise su carpeta de descargas.',
        type: NotificationType.INFO
      });

      expect(mockDownloadService.download).toHaveBeenCalledWith(
        'http://midominio.com/formato.pdf',
        'F-01.pdf',
        true
      );
    });
  });
});
