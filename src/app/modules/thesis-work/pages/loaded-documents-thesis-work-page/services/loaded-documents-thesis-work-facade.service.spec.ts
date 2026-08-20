import { TestBed } from '@angular/core/testing';
import { LoadedDocumentsThesisWorkFacadeService } from './loaded-documents-thesis-work-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { of, throwError } from 'rxjs';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

// Mockeamos el utilitario de lectura de archivos
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

describe('LoadedDocumentsThesisWorkFacadeService', () => {
  let service: LoadedDocumentsThesisWorkFacadeService;

  // Tipado estricto para los espías sin usar "unknown" ni "any"
  let thesisSpy: { uploadDocumentMock: jest.Mock };
  let downloadSpy: { download: jest.Mock };
  let notificationSpy: { show: jest.Mock };

  beforeEach(() => {
    thesisSpy = { uploadDocumentMock: jest.fn() };
    downloadSpy = { download: jest.fn() };
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

    // Mock para crypto.randomUUID respetando el Template Literal Type de TS
    const mockUUID = '12345678-1234-1234-1234-123456789abc' as `${string}-${string}-${string}-${string}-${string}`;

    if (!global.crypto) {
      Object.defineProperty(global, 'crypto', {
        value: { randomUUID: jest.fn().mockReturnValue(mockUUID) }
      });
    } else {
      jest.spyOn(global.crypto, 'randomUUID').mockReturnValue(mockUUID);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('uploadDocument', () => {
    it('debe estructurar el documento correctamente, llamar callbacks y emitir notificaciones de éxito', async () => {
      // Arrange
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mocked-base64');
      thesisSpy.uploadDocumentMock.mockReturnValue(of(undefined));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      const mockFile = new File([''], 'mi-archivo.pdf', { type: 'application/pdf' });

      // Act
      await service.uploadDocument(
        'tw-1',
        { fileName: 'mi-archivo.pdf', file: mockFile },
        DocumentType.AVANCE,
        successCb,
        errorCb
      );

      // Assert
      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(thesisSpy.uploadDocumentMock).toHaveBeenCalledWith('tw-1', expect.objectContaining({
        name: 'mi-archivo', // Verifica que se limpió el .pdf
        type: DocumentType.AVANCE,
        status: stateList.EN_REVISION,
        id: '12345678-1234-1234-1234-123456789abc', // Coincide con el mock del UUID
        url: 'data:application/pdf;base64,mocked-base64' // Verifica que se asignó la URL leída
      }));

      expect(successCb).toHaveBeenCalled();
      expect(errorCb).not.toHaveBeenCalled();

      expect(notificationSpy.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO, title: 'Subiendo documento' }));
      expect(notificationSpy.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.CONFIRMATION, title: '¡Carga exitosa!' }));
    });

    it('debe ejecutar callback onError si la lectura del archivo falla (readFileAsDataUrl arroja error)', async () => {
      // Arrange
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('Archivo corrupto'));
      const successCb = jest.fn();
      const errorCb = jest.fn();
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await service.uploadDocument('tw-1', { fileName: 'test.pdf', file: new File([], 'test.pdf') }, DocumentType.AVANCE, successCb, errorCb);

      // Assert
      expect(thesisSpy.uploadDocumentMock).not.toHaveBeenCalled(); // Nunca debió intentar subir nada
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenLastCalledWith(expect.objectContaining({ title: 'Error al leer el archivo', type: NotificationType.ERROR }));
    });

    it('debe ejecutar callback onError si la subida (servicio) falla', async () => {
      // Arrange
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('base-64-string');
      thesisSpy.uploadDocumentMock.mockReturnValue(throwError(() => new Error('Error de red')));
      const successCb = jest.fn();
      const errorCb = jest.fn();
      jest.spyOn(console, 'error').mockImplementation(() => {});

      // Act
      await service.uploadDocument('tw-1', { fileName: 'test.pdf', file: new File([], 'test.pdf') }, DocumentType.AVANCE, successCb, errorCb);

      // Assert
      expect(errorCb).toHaveBeenCalled();
      expect(successCb).not.toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenLastCalledWith(expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de carga' }));
    });
  });

  describe('downloadDocument', () => {
    it('debe llamar a downloadService si el documento tiene URL', async () => {
      await service.downloadDocument({ name: 'mi-doc', url: 'http://url.com' } as FileDocument);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://url.com', 'mi-doc.pdf');
    });

    it('debe mostrar notificación de error si no hay URL y abortar', async () => {
      await service.downloadDocument({ name: 'mi-doc', url: '' } as FileDocument);
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debe atrapar errores en la descarga del servicio', async () => {
      downloadSpy.download.mockRejectedValue(new Error('Fallo de red'));
      jest.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadDocument({ name: 'mi-doc', url: 'http://url.com' } as FileDocument);
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de descarga' }));
    });
  });

  describe('downloadDocumentByName', () => {
    // Evitamos "any" o "unknown" tipando la estructura con Partial e inyectándola como el tipo real
    const mockAdvance: Partial<Advance> = { documents: [{ name: 'doc-avance', url: 'http://avance.com' } as FileDocument] };
    const mockThesis: Partial<ThesisWork> = { documents: [{ name: 'doc-tesis', url: 'http://tesis.com' } as FileDocument] };

    it('debe buscar el documento en selectedAdvance si la pestaña activa es AVANCES', async () => {
      await service.downloadDocumentByName('doc-avance', 'AVANCES', mockAdvance as Advance, mockThesis as ThesisWork);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://avance.com', 'doc-avance.pdf');
    });

    it('debe buscar el documento en thesis si la pestaña activa NO es AVANCES', async () => {
      await service.downloadDocumentByName('doc-tesis', 'DOCUMENTOS', mockAdvance as Advance, mockThesis as ThesisWork);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://tesis.com', 'doc-tesis.pdf');
    });

    it('debe manejar de forma segura si el documento no existe en la fuente seleccionada (fallback sin url)', async () => {
      await service.downloadDocumentByName('archivo-fantasma', 'AVANCES', mockAdvance as Advance, mockThesis as ThesisWork);
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de descarga' }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debe ser resiliente si selectedAdvance o thesis vienen nulos o indefinidos', async () => {
      await service.downloadDocumentByName('doc', 'AVANCES', null, undefined);
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });

  describe('Notificaciones genéricas', () => {
    it('showRestrictedActionNotification debe emitir un ERROR', () => {
      service.showRestrictedActionNotification();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });

    it('showNotFoundError debe emitir un ERROR', () => {
      service.showNotFoundError();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });
});
