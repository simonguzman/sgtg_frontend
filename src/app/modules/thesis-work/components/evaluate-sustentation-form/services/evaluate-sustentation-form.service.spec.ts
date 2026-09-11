// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { EvaluateSustentationFormService } from './evaluate-sustentation-form.service';

// 3. Dependencias (Servicios)
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockParticipantsService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getAssignedJurors: jest.Mock<string, [SustentationRegistry | null]>;
}

interface MockDocumentResolverService {
  resolveLatestFinalDeliveryDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
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
  codeNumber: 1234567890, // ← Aprendido e integrado
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123', // ← Aprendido e integrado en la raíz
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
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
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

// 🔥 FIX: Adaptado exactamente a la interfaz real de SustentationRegistry
const createMockSustentationRegistry = (overrides: Partial<SustentationRegistry> = {}): SustentationRegistry => ({
  id: 'sust-1',
  sustentationDate: new Date(),
  location: 'Auditorio',
  assignedJurors: [
    createMockUser({ id: 'j-1', firstName: 'Jurado', lastName: 'Uno' }),
    createMockUser({ id: 'j-2', firstName: 'Jurado', lastName: 'Dos' })
  ],
  verdicts: [],
  ...overrides
});

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'archivo.pdf',
  url: 'http://test/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateSustentationFormService', () => {
  let service: EvaluateSustentationFormService;

  // Tipados estructurales exactos
  let notificationMock: MockNotificationService;
  let participantsMock: MockParticipantsService;
  let resolverMock: MockDocumentResolverService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    notificationMock = { show: jest.fn() };

    participantsMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn()
    };

    resolverMock = {
      resolveLatestFinalDeliveryDocument: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSustentationFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: resolverMock }
      ]
    });

    service = TestBed.inject(EvaluateSustentationFormService);
  });

  afterEach(() => {
    // Evita la contaminación de los mocks entre pruebas
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Delegación de Nombres (Participants)', () => {
    // Objeto mock seguro generado por la fábrica
    const mockThesis = createMockThesisWork();

    it('debería delegar la obtención de nombres de estudiantes y director al servicio formateador', () => {
      participantsMock.getStudentNames.mockReturnValue('Estudiante 1');
      expect(service.getStudentNames(mockThesis)).toBe('Estudiante 1');
      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesis);

      participantsMock.getDirectorName.mockReturnValue('Director 1');
      expect(service.getDirectorName(mockThesis)).toBe('Director 1');
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar la obtención de codirector y asesor al servicio formateador', () => {
      participantsMock.getCodirectorName.mockReturnValue('Codirector 1');
      expect(service.getCodirectorName(mockThesis)).toBe('Codirector 1');
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);

      participantsMock.getAdvisorName.mockReturnValue('Asesor 1');
      expect(service.getAdvisorName(mockThesis)).toBe('Asesor 1');
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar los jurados asignados correctamente', () => {
      const mockSustentation = createMockSustentationRegistry();
      participantsMock.getAssignedJurors.mockReturnValue('Jurado A, Jurado B');

      expect(service.getAssignedJurors(mockSustentation)).toBe('Jurado A, Jurado B');
      expect(participantsMock.getAssignedJurors).toHaveBeenCalledWith(mockSustentation);
    });
  });

  describe('Obtención de Documentos Existentes', () => {
    const mockThesis = createMockThesisWork();

    it('debería resolver el documento si el tipo es MONOGRAFIA o ANEXOS (ignorando espacios y mayúsculas)', () => {
      const mockFile = createMockFileDocument({ name: 'archivo.pdf' });
      resolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(mockFile);

      const docMonografia = service.getExistingDocument(mockThesis, 'monografia ');
      expect(docMonografia).toEqual(mockFile);
      expect(resolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesis, 'MONOGRAFIA');

      const docAnexos = service.getExistingDocument(mockThesis, 'aNeXoS ');
      expect(docAnexos).toEqual(mockFile);
      expect(resolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesis, 'ANEXOS');
    });

    it('debería retornar null si el tipo de documento no es permitido', () => {
      const doc = service.getExistingDocument(mockThesis, 'OTRO_TIPO');
      expect(doc).toBeNull();
      expect(resolverMock.resolveLatestFinalDeliveryDocument).not.toHaveBeenCalled();
    });
  });

  describe('Notificaciones', () => {
    it('debería mostrar notificación informativa al adjuntar archivo', () => {
      service.notifyFileAttached('acta.pdf');

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El acta de sustentación acta.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('debería mostrar notificación de error al faltar calificación', () => {
      service.notifyMissingVerdict();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Falta calificación',
        message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
        type: NotificationType.ERROR
      });
    });

    it('debería mostrar notificación de error al faltar formato', () => {
      service.notifyMissingFile();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Formato faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
        type: NotificationType.ERROR
      });
    });
  });
});
