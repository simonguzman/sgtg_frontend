// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

// 2. Servicios propios y externos a probar/mockear
import { EvaluateAdvanceFacadeService } from './evaluate-advance-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// 3. Utilidades y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

// 4. Interfaces y Tipos
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../../interfaces/advance-playload.interface';

// Mock de la función utilitaria independiente para no usar el FileReader real del navegador
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));

describe('EvaluateAdvanceFacadeService', () => {
  let service: EvaluateAdvanceFacadeService;
  let thesisServiceSpy: jest.Mocked<ThesisWorkService>;
  let downloadServiceSpy: jest.Mocked<FileDownloadService>;
  let notificationSpy: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Arrange: Espías fuertemente tipados
    thesisServiceSpy = {
      getThesisWorkByIdMock: jest.fn(),
      addEvaluationMock: jest.fn()
    } as unknown as jest.Mocked<ThesisWorkService>;

    downloadServiceSpy = {
      download: jest.fn()
    } as unknown as jest.Mocked<FileDownloadService>;

    notificationSpy = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    // Arrange: Mockeamos randomUUID nativo (necesario en entornos JSDOM)
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' },
      writable: true
    });

    TestBed.configureTestingModule({
      providers: [
        EvaluateAdvanceFacadeService,
        { provide: ThesisWorkService, useValue: thesisServiceSpy },
        { provide: FileDownloadService, useValue: downloadServiceSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(EvaluateAdvanceFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debe emitir onSuccess si el proyecto se encuentra en la base de datos', () => {
      // Arrange
      const mockThesis = { thesisWorkId: '1' } as unknown as ThesisWork;
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      service.loadThesisWork('1', successCb, errorCb);

      // Assert
      expect(successCb).toHaveBeenCalledWith(mockThesis);
      expect(errorCb).not.toHaveBeenCalled();
    });

    it('debe emitir onError y mostrar notificación INFO si el proyecto es null (no encontrado)', () => {
      // Arrange
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(null as unknown as ThesisWork));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      service.loadThesisWork('1', successCb, errorCb);

      // Assert
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });

    it('debe emitir onError y mostrar notificación ERROR si falla la petición HTTP', () => {
      // Arrange
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network Error')));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      service.loadThesisWork('1', successCb, errorCb);

      // Assert
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Guardado de Evaluación (saveEvaluation)', () => {
    const mockThesis = {
      thesisWorkId: 't-1',
      preliminaryDraftData: { proposalId: 'p-1' }
    } as unknown as ThesisWork;
    const mockAdvance = { id: 'a-1' } as unknown as Advance;
    const mockUser = { id: 'u-1', firstName: 'Juan', lastName: 'Perez' } as unknown as User;

    it('debe convertir archivos a DataUrl, mapear a EVALUADO y notificar éxito', async () => {
      // Arrange
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mocked');
      thesisServiceSpy.addEvaluationMock.mockReturnValue(of(void 0));

      const mockFile = new File([''], 'feedback.pdf', { type: 'application/pdf' });
      const payload = {
        formValues: { result: AdvanceEvaluationResult.EVALUADO, comments: 'Excelente' },
        files: [mockFile]
      } as unknown as SubmitAdvanceEvaluationPayload;

      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act (Ahora es asíncrono)
      await service.saveEvaluation(mockThesis, mockAdvance, mockUser, payload, successCb, errorCb);

      // Assert
      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(thesisServiceSpy.addEvaluationMock).toHaveBeenCalledWith('t-1', expect.objectContaining({
        veredict: stateList.EVALUADO,
        signedDocuments: [{ name: 'feedback.pdf', url: 'data:application/pdf;base64,mocked' }], // Estructura FormattedDocument
        evaluatorName: 'Juan Perez'
      }));
      expect(successCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debe emitir onError y notificar si ocurre un error al procesar (leer) los documentos locales', async () => {
      // Arrange
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('File Read Error'));

      const mockFile = new File([''], 'corrupt.pdf');
      const payload = {
        formValues: { result: AdvanceEvaluationResult.EN_REVISION, comments: 'Revisar' },
        files: [mockFile]
      } as unknown as SubmitAdvanceEvaluationPayload;

      const successCb = jest.fn();
      const errorCb = jest.fn();

      // Act
      await service.saveEvaluation(mockThesis, mockAdvance, mockUser, payload, successCb, errorCb);

      // Assert
      expect(thesisServiceSpy.addEvaluationMock).not.toHaveBeenCalled();
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Descarga de Archivos (downloadAdvance)', () => {
    it('debe llamar a downloadService si el avance tiene documentos válidos con URL', async () => {
      // Arrange
      downloadServiceSpy.download.mockResolvedValue();
      const mockAdvance = { documents: [{ url: 'http://test/doc.pdf', name: 'doc1.pdf' }] } as unknown as Advance;

      // Act
      await service.downloadAdvance(mockAdvance);

      // Assert
      expect(downloadServiceSpy.download).toHaveBeenCalledWith('http://test/doc.pdf', 'doc1.pdf');
    });

    it('debe notificar error si el documento no tiene url (detiene el flujo temprano)', async () => {
      // Arrange
      const mockAdvance = { documents: [{ name: 'doc-sin-url.pdf' }] } as unknown as Advance;

      // Act
      await service.downloadAdvance(mockAdvance);

      // Assert
      expect(downloadServiceSpy.download).not.toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });

    it('debe capturar el error (catch) y notificar si la descarga falla', async () => {
      // Arrange
      downloadServiceSpy.download.mockRejectedValue(new Error('Download Failed'));
      const mockAdvance = { documents: [{ url: 'http://test/doc.pdf', name: 'doc1.pdf' }] } as unknown as Advance;

      // Act
      await service.downloadAdvance(mockAdvance);

      // Assert
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de descarga' })
      );
    });
  });

  describe('Errores de UI (showNavigationError)', () => {
    it('debe invocar la notificación de error estándar', () => {
      // Act
      service.showNavigationError();

      // Assert
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });
});
