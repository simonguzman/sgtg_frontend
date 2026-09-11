import { TestBed } from '@angular/core/testing';
import { DownloadableFormatsFacadeService } from './downloadable-formats-facade.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../components/notifications/services/notification.service';
import { NotificationType } from '../../../components/notifications/models/notification.model';
import { DownloadableFormat } from '../models/downloadable-formats-page.model';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockDownloadableFormat = (overrides: Partial<DownloadableFormat> = {}): DownloadableFormat => ({
  id: 'f-01',
  title: 'Formato de Prueba',
  url: 'http://midominio.com/formato.pdf',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('DownloadableFormatsFacadeService', () => {
  let facade: DownloadableFormatsFacadeService;

  // Tipado estricto de Mocks (Zero-Any)
  let mockDownloadService: {
    download: jest.Mock<Promise<void>, [string, string, boolean]>;
  };

  let mockNotificationService: {
    show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia de advertencias y errores
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
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  describe('downloadFormat()', () => {
    it('debería mostrar notificación de error y detenerse si la URL es inválida (vacía o solo espacios)', async () => {
      // Usando la fábrica para simular la URL inválida con espacios
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
      // Creamos el formato simulado con parámetros ideales
      const mockFormat = createMockDownloadableFormat({
        id: 'f-01', // El código debe transformarse a F-01
        title: 'Formato de Prueba',
        url: 'http://midominio.com/formato.pdf'
      });

      await facade.downloadFormat(mockFormat);

      // Verificamos la notificación de información (Inicio)
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Descarga en curso',
        message: 'Iniciando la descarga del F-01. Revise su carpeta de descargas.',
        type: NotificationType.INFO
      });

      // Verificamos que se haya llamado a la descarga con los 3 argumentos correctos
      expect(mockDownloadService.download).toHaveBeenCalledWith(
        'http://midominio.com/formato.pdf',
        'F-01.pdf',
        true // <-- Se añade el flag useBlob esperado
      );
    });
  });
});
