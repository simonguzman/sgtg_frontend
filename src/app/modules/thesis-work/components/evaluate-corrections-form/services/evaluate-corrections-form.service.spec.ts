// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { EvaluateCorrectionsFormService } from './evaluate-corrections-form.service';

// 3. Dependencias (Servicios)
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ─────────

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockAuthService {
  currentUser: jest.Mock<User | null, []>;
}

interface MockParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getAssignedJurors: jest.Mock<string, [SustentationRegistry | undefined]>;
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
  name: 'archivo',
  url: 'http://test.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' })],
  verdicts: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    sustentations: [createMockSustentationRegistry()],
    state: stateList.APROBADO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
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
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

// 🔥 FIX: Actualizado rigurosamente a la interfaz CorrectedDelivery enviada
const createMockCorrectedDelivery = (overrides: Partial<CorrectedDelivery> = {}): CorrectedDelivery => ({
  id: 'delivery-1',
  uploadDate: new Date(),
  monograph: createMockFileDocument({ id: 'doc-mono', name: 'Monografia Corregida' }),
  annexes: createMockFileDocument({ id: 'doc-anexos', name: 'Anexos Corregidos' }),
  status: stateList.EN_DESARROLLO,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateCorrectionsFormService', () => {
  let service: EvaluateCorrectionsFormService;

  // Interfaces Mocks estrictas
  let notificationServiceMock: MockNotificationService;
  let fileDownloadServiceMock: MockFileDownloadService;
  let authServiceMock: MockAuthService;
  let participantsFormatterMock: MockParticipantsFormatterService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva y global
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente, CERO casteos a "any" o "unknown"
    notificationServiceMock = {
      show: jest.fn()
    };

    fileDownloadServiceMock = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    authServiceMock = {
      currentUser: jest.fn()
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateCorrectionsFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: fileDownloadServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(EvaluateCorrectionsFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Prevenir fugas entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Delegación a ThesisParticipantsFormatterService', () => {
    const mockThesisWork = createMockThesisWork();

    it('debería delegar los nombres correctamente', () => {
      service.getStudentNames(mockThesisWork);
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);

      service.getDirectorName(mockThesisWork);
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);

      service.getCodirectorName(mockThesisWork);
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);

      service.getAdvisorName(mockThesisWork);
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar los jurados asignados extrayendo la sustentación', () => {
      service.getAssignedJurors(mockThesisWork);
      expect(participantsFormatterMock.getAssignedJurors).toHaveBeenCalledWith(mockThesisWork.sustentations?.[0]);
    });
  });

  describe('Validaciones', () => {
    it('debería validar observaciones correctamente (mínimo 10 caracteres)', () => {
      expect(service.isObservationsValid('Corta')).toBe(false);
      expect(service.isObservationsValid('   Vacía   ')).toBe(false); // Validando el trim() implícito
      expect(service.isObservationsValid('Esta es una observación válida')).toBe(true);
    });
  });

  describe('Construcción del Payload de Evaluación', () => {
    it('debería construir el payload correctamente con un usuario en sesión y entregas válidas', () => {
      const mockUser = createMockUser({ id: 'u1', firstName: 'John', lastName: 'Doe' });
      authServiceMock.currentUser.mockReturnValue(mockUser);

      const mockThesisWork = createMockThesisWork();
      const mockDeliveries = [createMockCorrectedDelivery({ monograph: createMockFileDocument({ id: 'doc1' }) })];

      const payload = service.buildEvaluationPayload(mockThesisWork, stateList.APROBADO, 'Todo bien', mockDeliveries);

      expect(payload).toEqual({
        documentId: 'doc1',
        proposalId: 'prop-1',
        evaluatorId: 'u1',
        evaluatorName: 'John Doe',
        evaluatorRole: 'JURADO',
        veredict: stateList.APROBADO,
        observations: 'Todo bien'
      });
    });

    it('debería manejar casos donde el usuario no esté en sesión o falten entregas/datos (Fallback seguro)', () => {
      authServiceMock.currentUser.mockReturnValue(null);

      const mockThesisWithoutData = createMockThesisWork();
      // 🔥 FIX: Mutación legal y estricta, vaciando el ID en lugar de inyectar 'undefined as any'
      mockThesisWithoutData.preliminaryDraftData.proposalData.id = '';

      const payload = service.buildEvaluationPayload(mockThesisWithoutData, stateList.NO_APROBADO, 'Falta info', []);

      expect(payload).toEqual({
        documentId: '',
        proposalId: '',
        evaluatorId: '',
        evaluatorName: 'Jurado Asignado',
        evaluatorRole: 'JURADO',
        veredict: stateList.NO_APROBADO,
        observations: 'Falta info'
      });
    });
  });

  describe('Descarga de documentos', () => {
    it('debería descargar el documento si tiene URL válida', async () => {
      const mockDoc = createMockFileDocument({ url: 'http://test.com/doc.pdf', name: 'Documento' });

      await service.downloadDocument(mockDoc);

      expect(fileDownloadServiceMock.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'Documento.pdf');
    });

    it('debería mostrar notificación de error si el documento no tiene URL', async () => {
      const mockDoc = createMockFileDocument({ url: '', name: 'Documento' });

      await service.downloadDocument(mockDoc);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de archivo',
        message: 'Este documento no posee una ruta válida de descarga.',
        type: NotificationType.ERROR
      });
      expect(fileDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('debería capturar la excepción y notificar el error si la descarga falla (catch block)', async () => {
      // Simular error en el API de descarga
      fileDownloadServiceMock.download.mockRejectedValueOnce(new Error('Network error'));
      const mockDoc = createMockFileDocument({ url: 'http://test.com/doc.pdf', name: 'Documento' });

      await service.downloadDocument(mockDoc);

      // Verificamos que se haya ejecutado el error en consola de manera controlada
      expect(console.error).toHaveBeenCalledWith(`Error al descargar el documento Documento:`, expect.any(Error));

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No se pudo descargar Documento. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Notificaciones', () => {
    it('debería ejecutar notifyFileAttached con la información correcta', () => {
      service.notifyFileAttached();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Acta Adjunta',
        message: 'El Formato_G se ha vinculado correctamente a la evaluación.',
        type: NotificationType.INFO
      });
    });

    it('debería ejecutar notifyMissingVerdict con el error correcto', () => {
      service.notifyMissingVerdict();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Dictamen requerido',
        message: 'Debe seleccionar una decisión de evaluación.',
        type: NotificationType.ERROR
      });
    });

    it('debería ejecutar notifyInvalidObservations con el error y el límite configurado', () => {
      service.notifyInvalidObservations();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Observaciones vacías',
        message: 'Debe ingresar una justificación técnica detallada (mínimo 10 caracteres).',
        type: NotificationType.ERROR
      });
    });

    it('debería ejecutar notifyMissingFormatG con el error correcto', () => {
      service.notifyMissingFormatG();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Formato_G Faltante',
        message: 'Es obligatorio cargar el Formato_G firmado para continuar.',
        type: NotificationType.ERROR
      });
    });
  });
});
