// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { LoadedDocumentsThesisWorkFacadeService } from './loaded-documents-thesis-work-facade.service';

// 3. Dependencias
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces, Enums y Utilidades
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Advance } from '../../../interfaces/advance.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Mapeo de Mocks Globales (Hoisted por Jest) ──────────────────────────────
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('10 - 10 - 2026')
}));
import { formatThesisDate } from '../../../helpers/thesis-date.helper';

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown' ni casteos dobles) ──

interface MockThesisWorkService {
  uploadDocumentMock: jest.Mock<Observable<void>, [string, FileDocument]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
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
});

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
  documents: [], // Array de FileDocument
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: 'tw-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    correctedDeliveries: [],
    sustentations: [],
    advances: [],
    finalDeliveries: [],
    pazYSalvos: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    isArchived: false,
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Título Mock',
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('LoadedDocumentsThesisWorkFacadeService', () => {
  let service: LoadedDocumentsThesisWorkFacadeService;

  let thesisSpy: MockThesisWorkService;
  let downloadSpy: MockFileDownloadService;
  let notificationSpy: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola para pruebas asíncronas
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

    // Mock para crypto.randomUUID
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

  describe('uploadDocument', () => {
    it('debe estructurar el documento correctamente, llamar callbacks y emitir notificaciones de éxito', async () => {
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mocked-base64');
      thesisSpy.uploadDocumentMock.mockReturnValue(of(undefined));
      const successCb = jest.fn();
      const errorCb = jest.fn();

      const mockFile = new File([''], 'mi-archivo.pdf', { type: 'application/pdf' });

      await service.uploadDocument(
        'tw-1',
        { fileName: 'mi-archivo.pdf', file: mockFile },
        DocumentType.AVANCE,
        successCb,
        errorCb
      );

      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(formatThesisDate).toHaveBeenCalled();
      expect(thesisSpy.uploadDocumentMock).toHaveBeenCalledWith(
        'tw-1',
        expect.objectContaining({
          name: 'mi-archivo',
          type: DocumentType.AVANCE,
          status: stateList.EN_REVISION,
          id: '12345678-1234-1234-1234-123456789abc',
          url: 'data:application/pdf;base64,mocked-base64',
          uploadDate: '10 - 10 - 2026'
        })
      );

      expect(successCb).toHaveBeenCalled();
      expect(errorCb).not.toHaveBeenCalled();

      expect(notificationSpy.show).toHaveBeenNthCalledWith(1, {
        title: 'Subiendo documento',
        message: 'Procesando el archivo PDF y actualizando los registros...',
        type: NotificationType.INFO
      });
      expect(notificationSpy.show).toHaveBeenNthCalledWith(2, {
        title: '¡Carga exitosa!',
        message: 'El documento se cargó correctamente y el flujo de estados ha sido actualizado.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debe ejecutar callback onError si la lectura del archivo falla', async () => {
      const mockError = new Error('Archivo corrupto');
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(mockError);

      const successCb = jest.fn();
      const errorCb = jest.fn();

      await service.uploadDocument(
        'tw-1',
        { fileName: 'test.pdf', file: new File([], 'test.pdf') },
        DocumentType.AVANCE,
        successCb,
        errorCb
      );

      expect(console.error).toHaveBeenCalledWith('Error leyendo el archivo seleccionado:', mockError);
      expect(thesisSpy.uploadDocumentMock).not.toHaveBeenCalled();
      expect(errorCb).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenLastCalledWith({
        title: 'Error al leer el archivo',
        message: 'No se pudo procesar el archivo seleccionado.',
        type: NotificationType.ERROR
      });
    });

    it('debe ejecutar callback onError si la subida HTTP a la API falla', async () => {
      const mockApiError = new Error('Error de red');
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('base-64-string');
      thesisSpy.uploadDocumentMock.mockReturnValue(throwError(() => mockApiError));

      const successCb = jest.fn();
      const errorCb = jest.fn();

      await service.uploadDocument(
        'tw-1',
        { fileName: 'test.pdf', file: new File([], 'test.pdf') },
        DocumentType.AVANCE,
        successCb,
        errorCb
      );

      expect(console.error).toHaveBeenCalledWith('Error detectado en la carga de archivos:', mockApiError);
      expect(errorCb).toHaveBeenCalled();
      expect(successCb).not.toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenLastCalledWith({
        title: 'Error de carga',
        message: 'Hubo un problema al subir el archivo. Inténtelo de nuevo.',
        type: NotificationType.ERROR
      });
    });
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

  // ---------------------------------------------------------------------------------
  // ESTA ES LA SUITE QUE FALLABA POR TENER FIRMA VIEJA EN TU ENTORNO LOCAL
  // ---------------------------------------------------------------------------------
  describe('downloadDocumentByName', () => {
    const advanceDoc = createMockFileDocument({ name: 'doc-avance', url: 'http://avance.com' });
    const mockAdvance = createMockAdvance({ documents: [advanceDoc] });

    it('debe buscar y descargar el documento en selectedAdvance si existe', async () => {
      // FIX: Solo pasamos 2 parámetros, tal como exige el Facade actual
      await service.downloadDocumentByName('doc-avance', mockAdvance);
      expect(downloadSpy.download).toHaveBeenCalledWith('http://avance.com', 'doc-avance.pdf');
    });

    it('debe manejar de forma segura si el documento solicitado no existe en el avance (fallback a url vacía)', async () => {
      // FIX: Solo pasamos 2 parámetros
      await service.downloadDocumentByName('archivo-fantasma', mockAdvance);

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debe ser resiliente y no arrojar excepciones (null pointer) si selectedAdvance viene nulo', async () => {
      // FIX: Solo pasamos 2 parámetros
      await service.downloadDocumentByName('doc', null);

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });
  });
  // ---------------------------------------------------------------------------------

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
