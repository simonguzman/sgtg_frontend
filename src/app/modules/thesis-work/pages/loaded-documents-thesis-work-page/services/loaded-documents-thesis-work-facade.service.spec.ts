import { TestBed } from '@angular/core/testing';
import { Observable } from 'rxjs';
import { LoadedDocumentsThesisWorkFacadeService } from './loaded-documents-thesis-work-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';

jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));

jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('10 - 10 - 2026')
}));

interface MockThesisWorkService {
  uploadDocumentMock: jest.Mock<Observable<void>, [string, FileDocument]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento',
  url: 'http://url.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => ({
  id: 'adv-1',
  title: 'Avance Mock',
  comments: 'Observaciones base',
  uploadDate: new Date(),
  studentId: 'student-1',
  status: stateList.EN_REVISION,
  documents: [],
  ...overrides
});

describe('LoadedDocumentsThesisWorkFacadeService', () => {
  let service: LoadedDocumentsThesisWorkFacadeService;

  let thesisSpy: MockThesisWorkService;
  let downloadSpy: MockFileDownloadService;
  let notificationSpy: MockNotificationService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisSpy = { uploadDocumentMock: jest.fn() };
    downloadSpy = { download: jest.fn().mockResolvedValue(undefined) };
    notificationSpy = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        LoadedDocumentsThesisWorkFacadeService,
        { provide: ThesisWorkService, useValue: thesisSpy },
        { provide: FileDownloadService, useValue: downloadSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(LoadedDocumentsThesisWorkFacadeService);

    const mockUUID = '12345678-1234-1234-1234-123456789abc' as `${string}-${string}-${string}-${string}-${string}`;

    if (!global.crypto) {
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: jest.fn().mockReturnValue(mockUUID) },
        configurable: true
      });
    } else {
      jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(mockUUID);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('downloadDocument', () => {
    it('debe llamar a downloadService si el documento tiene URL válida', async () => {
      const validDoc = createMockFileDocument({ name: 'mi-doc', url: 'http://url.com' });
      await service.downloadDocument(validDoc);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://url.com', 'mi-doc.pdf');
    });

    it('debe mostrar notificación de error si el documento no tiene URL y abortar descarga', async () => {
      const invalidDoc = createMockFileDocument({ name: 'mi-doc', url: '' });
      await service.downloadDocument(invalidDoc);
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No existe una URL válida vinculada a este archivo.',
        type: NotificationType.ERROR
      });
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debe registrar error en consola y notificar al usuario si la API de descarga (blob) falla', async () => {
      const mockNetworkError = new Error('Fallo de red');
      downloadSpy.download.mockRejectedValue(mockNetworkError);
      const docToDownload = createMockFileDocument({ name: 'mi-doc', url: 'http://url.com' });

      await service.downloadDocument(docToDownload);

      expect(console.error).toHaveBeenCalledWith(`Error al descargar el documento mi-doc:`, mockNetworkError);
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: `No se pudo descargar mi-doc. Intente más tarde.`,
        type: NotificationType.ERROR
      });
    });
  });

  describe('downloadDocumentByName', () => {
    const advanceDoc = createMockFileDocument({ name: 'doc-avance', url: 'http://avance.com' });
    const mockAdvance = createMockAdvance({ documents: [advanceDoc] });

    it('debe buscar y descargar el documento en selectedAdvance si existe', async () => {
      await service.downloadDocumentByName('doc-avance', mockAdvance);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://avance.com', 'doc-avance.pdf');
    });

    it('debe manejar de forma segura si el documento solicitado no existe en el avance (fallback a url vacía)', async () => {
      await service.downloadDocumentByName('archivo-fantasma', mockAdvance);

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debe ser resiliente y no arrojar excepciones (null pointer) si selectedAdvance viene nulo', async () => {
      await service.downloadDocumentByName('doc', null);

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });
  });

  describe('Notificaciones genéricas', () => {
    it('showRestrictedActionNotification debe emitir un ERROR detallado', () => {
      service.showRestrictedActionNotification();
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Acción no permitida',
        message: 'Su usuario no posee los privilegios necesarios para ejecutar esta evaluación.',
        type: NotificationType.ERROR
      });
    });

    it('showNotFoundError debe emitir un ERROR detallado', () => {
      service.showNotFoundError();
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Registro no encontrado',
        message: 'No fue posible cargar los detalles de este registro.',
        type: NotificationType.ERROR
      });
    });
  });
});
