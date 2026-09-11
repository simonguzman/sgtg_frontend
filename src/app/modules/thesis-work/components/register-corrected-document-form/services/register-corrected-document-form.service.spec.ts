// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { RegisterCorrectedDocumentFormService } from './register-corrected-document-form.service';

// 3. Dependencias (Servicios)
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterCorrectedDocumentFormService', () => {
  let service: RegisterCorrectedDocumentFormService;

  // Tipados estructurales exactos
  let notificationServiceMock: MockNotificationService;
  let participantsFormatterMock: MockParticipantsFormatterService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks estrictos inicializados sin casteos
    notificationServiceMock = {
      show: jest.fn()
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1')
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(RegisterCorrectedDocumentFormService);
  });

  // Limpieza vital para evitar fugas de memoria y contaminación entre tests
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Formateadores de nombres', () => {
    // Objeto mock seguro generado por la fábrica
    const mockThesisWork = createMockThesisWork();

    it('debería delegar getStudentNames al participantsFormatter', () => {
      expect(service.getStudentNames(mockThesisWork)).toBe('Estudiante 1');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getDirectorName al participantsFormatter', () => {
      expect(service.getDirectorName(mockThesisWork)).toBe('Director 1');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getCodirectorName al participantsFormatter', () => {
      expect(service.getCodirectorName(mockThesisWork)).toBe('Codirector 1');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getAdvisorName al participantsFormatter', () => {
      expect(service.getAdvisorName(mockThesisWork)).toBe('Asesor 1');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Notificaciones', () => {
    it('debería notificar el archivo adjunto correctamente con nivel INFO', () => {
      service.notifyFileAttached('mi_archivo.pdf');

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El documento mi_archivo.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('debería notificar cuando faltan documentos con nivel ERROR', () => {
      service.notifyMissingDocuments();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Documentos faltantes',
        message: 'Debe adjuntar obligatoriamente la Monografía corregida y los Anexos para continuar.',
        type: NotificationType.ERROR
      });
    });
  });
});
