// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { Observable, of, throwError } from 'rxjs';

// 2. Servicios propios y externos a probar/mockear
import { EvaluateAdvanceFacadeService } from './evaluate-advance-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// 3. Utilidades y Enums
import { stateList } from '../../../../../core/enums/state.enum';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// 4. Interfaces y Tipos
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { AdvanceEvaluationResult, SubmitAdvanceEvaluationPayload } from '../../../interfaces/advance-playload.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

// Mock de la función utilitaria independiente
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ───────────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | undefined | null>, [string]>;
  addEvaluationMock: jest.Mock<Observable<void>, [string, Evaluation]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  const base: Partial<User> = {
    id: 'u-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Juan',
    secondName: '',
    lastName: 'Perez',
    secondLastName: '',
    codeNumber: 1234567890,
    email: 'juan@test.com',
    password: 'hash',
    state: UserState.active,
    roles: [],
    ...overrides
  };
  return base as User;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: 't-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'p-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => {
  const base: Partial<FileDocument> = {
    id: 'doc-1',
    name: 'doc1.pdf',
    url: 'http://test/doc.pdf',
    type: DocumentType.AVANCE,
    uploadDate: new Date(),
    status: stateList.EN_REVISION,
    ...overrides
  };
  return base as FileDocument;
};

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => {
  const base: Partial<Advance> = {
    id: 'a-1',
    title: 'Avance 1',
    comments: 'Comentarios',
    uploadDate: new Date(),
    studentId: 'u-1',
    status: stateList.EN_REVISION,
    documents: [createMockFileDocument()],
    ...overrides
  };
  return base as Advance;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateAdvanceFacadeService', () => {
  let service: EvaluateAdvanceFacadeService;

  let thesisServiceSpy: MockThesisWorkService;
  let downloadServiceSpy: MockFileDownloadService;
  let notificationSpy: MockNotificationService;

  beforeAll(() => {
    // Mockeamos randomUUID nativo, asegurando que sea configurable para limpiarlo luego
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' },
      writable: true,
      configurable: true
    });
  });

  beforeEach(() => {
    // 🔕 Silenciar consola a nivel global para la suite
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange: Espías fuertemente tipados
    thesisServiceSpy = {
      getThesisWorkByIdMock: jest.fn(),
      addEvaluationMock: jest.fn()
    };

    downloadServiceSpy = {
      download: jest.fn()
    };

    notificationSpy = {
      show: jest.fn()
    };

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
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debe emitir onSuccess si el proyecto se encuentra en la base de datos', () => {
      const mockThesis = createMockThesisWork();
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const successCb = jest.fn();
      const errorCb = jest.fn();

      service.loadThesisWork('1', successCb, errorCb);

      expect(successCb).toHaveBeenCalledWith(mockThesis);
      expect(errorCb).not.toHaveBeenCalled();
    });

    it('debe emitir onError y mostrar notificación INFO si el proyecto es null (no encontrado)', () => {
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(null));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      service.loadThesisWork('1', successCb, errorCb);

      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });

    it('debe emitir onError y mostrar notificación ERROR si falla la petición HTTP', () => {
      thesisServiceSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network Error')));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      service.loadThesisWork('1', successCb, errorCb);

      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Guardado de Evaluación (saveEvaluation)', () => {
    const mockThesis = createMockThesisWork();
    const mockAdvance = createMockAdvance();
    const mockUser = createMockUser();

    it('debe convertir archivos a DataUrl, mapear a EVALUADO y notificar éxito', async () => {
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mocked');
      thesisServiceSpy.addEvaluationMock.mockReturnValue(of(void 0));

      const mockFile = new File([''], 'feedback.pdf', { type: 'application/pdf' });
      const payload: SubmitAdvanceEvaluationPayload = {
        formValues: { result: AdvanceEvaluationResult.EVALUADO, comments: 'Excelente' },
        files: [mockFile]
      };

      const successCb = jest.fn();
      const errorCb = jest.fn();

      await service.saveEvaluation(mockThesis, mockAdvance, mockUser, payload, successCb, errorCb);

      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(thesisServiceSpy.addEvaluationMock).toHaveBeenCalledWith('t-1', expect.objectContaining({
        veredict: stateList.EVALUADO,
        signedDocuments: [{ name: 'feedback.pdf', url: 'data:application/pdf;base64,mocked' }],
        evaluatorName: 'Juan Perez'
      }));
      expect(successCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debe emitir onError y notificar si ocurre un error al procesar (leer) los documentos locales', async () => {
      const readError = new Error('File Read Error');
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(readError);

      const mockFile = new File([''], 'corrupt.pdf');
      const payload: SubmitAdvanceEvaluationPayload = {
        formValues: { result: AdvanceEvaluationResult.EN_REVISION, comments: 'Revisar' },
        files: [mockFile]
      };

      const successCb = jest.fn();
      const errorCb = jest.fn();

      await service.saveEvaluation(mockThesis, mockAdvance, mockUser, payload, successCb, errorCb);

      // 🚀 Validación directa del log de error en la consola
      expect(console.error).toHaveBeenCalledWith('Error leyendo los documentos de retroalimentación:', readError);
      expect(thesisServiceSpy.addEvaluationMock).not.toHaveBeenCalled();
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Descarga de Archivos (downloadAdvance)', () => {

    // FIX: Ahora pasamos FileDocument directamente tal como exige la nueva firma del servicio

    it('debe llamar a downloadService si el documento es válido y tiene URL', async () => {
      downloadServiceSpy.download.mockResolvedValue();
      const mockDocument = createMockFileDocument({ url: 'http://test/doc.pdf', name: 'doc1.pdf' });

      await service.downloadAdvance(mockDocument);

      expect(downloadServiceSpy.download).toHaveBeenCalledWith('http://test/doc.pdf', 'doc1.pdf');
    });

    it('debe notificar error si el documento no tiene url (detiene el flujo temprano)', async () => {
      const mockDocument = createMockFileDocument({ url: '' });

      await service.downloadAdvance(mockDocument);

      expect(downloadServiceSpy.download).not.toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });

    it('debe capturar el error (catch) y notificar si la descarga falla', async () => {
      const downloadError = new Error('Download Failed');
      downloadServiceSpy.download.mockRejectedValue(downloadError);

      const mockDocument = createMockFileDocument();

      await service.downloadAdvance(mockDocument);

      expect(console.error).toHaveBeenCalledWith('Error al descargar el avance:', downloadError);
      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de descarga' })
      );
    });
  });

  describe('Errores de UI (showNavigationError)', () => {
    it('debe invocar la notificación de error estándar', () => {
      service.showNavigationError();

      expect(notificationSpy.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });
});
