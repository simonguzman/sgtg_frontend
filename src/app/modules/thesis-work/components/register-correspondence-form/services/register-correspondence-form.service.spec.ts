// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { RegisterCorrespondenceFormService } from './register-correspondence-form.service';

// 3. Dependencias (Servicios)
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ─────────

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  getMemberName: jest.Mock<string, [string | undefined]>;
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
    state: stateList.EN_DESARROLLO,
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

// Se importa el enum stateList para que la fábrica compile correctamente
import { stateList } from '../../../../../core/enums/state.enum';

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterCorrespondenceFormService', () => {
  let service: RegisterCorrespondenceFormService;

  // Interfaces Mocks estrictas
  let fileDownloadServiceMock: MockFileDownloadService;
  let notificationServiceMock: MockNotificationService;
  let participantsMock: MockParticipantsFormatterService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva y global
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización de mocks completamente Type-Safe
    fileDownloadServiceMock = {
      download: jest.fn().mockResolvedValue(undefined),
    };

    notificationServiceMock = {
      show: jest.fn(),
    };

    participantsMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getMemberName: jest.fn(),
      getAssignedJurors: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrespondenceFormService,
        { provide: FileDownloadService, useValue: fileDownloadServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
      ],
    });

    service = TestBed.inject(RegisterCorrespondenceFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpieza vital
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Delegación de Nombres (Participants)', () => {
    it('debería retornar "Sin estudiantes asignados" si no hay authors', () => {
      const mockThesis = createMockThesisWork();
      // Mutación segura usando JS nativo para probar la rama 'falsy' sin TypeScript errors ni 'as any'
      Object.defineProperty(mockThesis.preliminaryDraftData.proposalData, 'authors', { value: undefined });

      expect(service.getStudentNames(mockThesis)).toBe('Sin estudiantes asignados');
      expect(participantsMock.getStudentNames).not.toHaveBeenCalled();
    });

    it('debería delegar los nombres de estudiantes si existen authors', () => {
      const mockThesis = createMockThesisWork(); // La fábrica incluye authors por defecto
      participantsMock.getStudentNames.mockReturnValue('Estudiante Prueba');

      expect(service.getStudentNames(mockThesis)).toBe('Estudiante Prueba');
      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar el resto de participantes correctamente', () => {
      const mockThesis = createMockThesisWork();

      service.getDirectorName(mockThesis);
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesis);

      service.getCodirectorName(mockThesis);
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);

      service.getAdvisorName(mockThesis);
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);

      service.getMemberName('id-1');
      expect(participantsMock.getMemberName).toHaveBeenCalledWith('id-1');
    });

    it('debería delegar los jurados asignados extrayendo la primera sustentación', () => {
      const mockThesis = createMockThesisWork();

      service.getAssignedJurors(mockThesis);

      // Validamos que le pase correctamente la posición [0]
      expect(participantsMock.getAssignedJurors).toHaveBeenCalledWith(mockThesis.sustentations![0]);
    });
  });

  describe('Búsqueda de Documentos Históricos', () => {
    it('debería encontrar el Formato_E usando el enum', () => {
      const docs = [
        createMockFileDocument({ id: '1', type: DocumentType.MONOGRAFIA }),
        createMockFileDocument({ id: '2', type: DocumentType.FORMATO_E })
      ];

      const result = service.findFormatoE(docs);
      expect(result?.id).toBe('2');
    });

    it('debería encontrar Paz y Salvo usando enum o string legacy', () => {
      const docsEnum = [createMockFileDocument({ id: '1', type: DocumentType.PAZ_Y_SALVO })];

      // Simular data legacy corrompida de base de datos sin romper tipado
      const legacyDoc = createMockFileDocument({ id: '2' });
      Object.defineProperty(legacyDoc, 'type', { value: 'Formato F' });
      const docsLegacy = [legacyDoc];

      expect(service.findFormatoF(docsEnum)?.id).toBe('1');
      expect(service.findFormatoF(docsLegacy)?.id).toBe('2');
    });

    it('debería encontrar Acta (G) priorizando CORRECCION sobre FORMATO_G', () => {
      const legacyCorrectionDoc = createMockFileDocument({ id: '2' });
      Object.defineProperty(legacyCorrectionDoc, 'type', { value: 'CORRECCION' });

      const docsBoth = [
        createMockFileDocument({ id: '1', type: DocumentType.FORMATO_G }),
        legacyCorrectionDoc
      ];

      expect(service.findFormatoG(docsBoth)?.id).toBe('2'); // Prioriza corrección (Legacy string)

      const docsOnlyG = [createMockFileDocument({ id: '1', type: DocumentType.FORMATO_G })];
      expect(service.findFormatoG(docsOnlyG)?.id).toBe('1'); // Cae al G
    });
  });

  describe('Manejo de Descargas y Validaciones', () => {
    it('debería notificar error si el documento no tiene URL', async () => {
      // Configuramos URL vacía (falsy) de forma estrictamente tipada
      const mockDoc = createMockFileDocument({ url: '' });

      await service.downloadDocument(mockDoc);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Archivo no disponible',
        message: 'El documento solicitado no cuenta con una URL válida.',
        type: NotificationType.ERROR
      });
      expect(fileDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('debería descargar el documento si tiene URL válida', async () => {
      const mockDoc = createMockFileDocument({ url: 'http://doc.pdf', name: 'Doc' });

      await service.downloadDocument(mockDoc);

      expect(fileDownloadServiceMock.download).toHaveBeenCalledWith('http://doc.pdf', 'Doc');
    });

    it('debería manejar y notificar el error si la descarga falla (catch block)', async () => {
      // Simulamos que el servicio HTTP falla
      fileDownloadServiceMock.download.mockRejectedValue(new Error('Network error'));
      const mockDoc = createMockFileDocument({ url: 'http://doc.pdf', name: 'Doc' });

      await service.downloadDocument(mockDoc);

      // Asserts exactos: validamos que el logger haya atrapado el error sin escupirlo
      expect(console.error).toHaveBeenCalledWith('Error al descargar el documento Doc:', expect.any(Error));

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No se pudo descargar Doc. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });

    it('debería notificar formato de archivo inválido', () => {
      service.notifyInvalidFileType();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Formato inválido',
        message: 'Solo se permiten archivos en formato PDF.',
        type: NotificationType.ERROR
      });
    });
  });
});
