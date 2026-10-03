import { TestBed } from '@angular/core/testing';
import { RegisterPazYSalvoFormService } from './register-paz-y-salvo-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockParticipantsService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

interface MockDocumentResolverService {
  resolveLatestFinalDeliveryDocument: jest.Mock<FileDocument | null, [ThesisWork, string]>;
}

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

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
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
        title: 'Título',
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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento.pdf',
  url: 'http://test/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

describe('RegisterPazYSalvoFormService', () => {
  let service: RegisterPazYSalvoFormService;

  let notificationMock: MockNotificationService;
  let participantsMock: MockParticipantsService;
  let documentResolverMock: MockDocumentResolverService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    notificationMock = {
      show: jest.fn()
    };

    participantsMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1'),
    };

    documentResolverMock = {
      resolveLatestFinalDeliveryDocument: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterPazYSalvoFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: documentResolverMock },
      ]
    });

    service = TestBed.inject(RegisterPazYSalvoFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Delegación de participantes', () => {
    it('debería obtener nombres delegando al formateador', () => {
      const student = service.getStudentNames(mockThesisWork);
      const director = service.getDirectorName(mockThesisWork);
      const codirector = service.getCodirectorName(mockThesisWork);
      const advisor = service.getAdvisorName(mockThesisWork);

      expect(student).toBe('Estudiante 1');
      expect(director).toBe('Director 1');
      expect(codirector).toBe('Codirector 1');
      expect(advisor).toBe('Asesor 1');

      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Resolución de Documentos (getExistingDocument)', () => {
    it('debería resolver MONOGRAFIA correctamente delegando en el resolver', () => {
      const mockDoc = createMockFileDocument();
      documentResolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(mockDoc);

      const result = service.getExistingDocument(mockThesisWork, 'monografia');

      expect(result).toEqual(mockDoc);
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesisWork, 'MONOGRAFIA');
    });

    it('debería normalizar FORMATO a FORMATO_E y resolverlo', () => {
      documentResolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(null);

      service.getExistingDocument(mockThesisWork, 'formato');

      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesisWork, 'FORMATO_E');
    });

    it('debería retornar null para un tipo de documento no válido sin llamar al resolver', () => {
      const result = service.getExistingDocument(mockThesisWork, 'INVALIDO');

      expect(result).toBeNull();
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).not.toHaveBeenCalled();
    });
  });

  describe('Sistema de Notificaciones', () => {
    it('notifyFileAttached() debería emitir una notificación de tipo INFO', () => {
      service.notifyFileAttached('archivo.pdf');

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El documento archivo.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('notifyMissingEvaluations() debería emitir notificación estricta de ERROR por falta de evaluación', () => {
      service.notifyMissingEvaluations();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Faltan evaluaciones',
        message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
        type: NotificationType.ERROR
      });
    });

    it('notifyMissingDocument() debería emitir notificación estricta de ERROR por falta de documento', () => {
      service.notifyMissingDocument();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Documento faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
        type: NotificationType.ERROR
      });
    });
  });
});
