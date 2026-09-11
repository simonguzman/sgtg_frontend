// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { UploadFinalDeliveryFormService } from './upload-final-delivery-form.service';

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

interface MockParticipantsService {
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
        title: 'Título de Prueba',
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

describe('UploadFinalDeliveryFormService', () => {
  let service: UploadFinalDeliveryFormService;

  // Espías tipados estrictamente
  let notificationSpy: MockNotificationService;
  let formatterSpy: MockParticipantsService;

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange: Configuración de espías limpios
    notificationSpy = {
      show: jest.fn()
    };

    formatterSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UploadFinalDeliveryFormService,
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ThesisParticipantsFormatterService, useValue: formatterSpy }
      ]
    });

    service = TestBed.inject(UploadFinalDeliveryFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Delegación de Formato de Participantes', () => {
    // Arrange general usando la fábrica en lugar de castings inseguros
    const mockThesis = createMockThesisWork();

    it('debe delegar getStudentNames al formatter', () => {
      // Arrange
      formatterSpy.getStudentNames.mockReturnValue('Estudiante 1');

      // Act
      const result = service.getStudentNames(mockThesis);

      // Assert
      expect(result).toBe('Estudiante 1');
      expect(formatterSpy.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getDirectorName al formatter', () => {
      // Arrange
      formatterSpy.getDirectorName.mockReturnValue('Director 1');

      // Act
      const result = service.getDirectorName(mockThesis);

      // Assert
      expect(result).toBe('Director 1');
      expect(formatterSpy.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getCodirectorName al formatter', () => {
      // Arrange
      formatterSpy.getCodirectorName.mockReturnValue('Codirector 1');

      // Act
      const result = service.getCodirectorName(mockThesis);

      // Assert
      expect(result).toBe('Codirector 1');
      expect(formatterSpy.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getAdvisorName al formatter', () => {
      // Arrange
      formatterSpy.getAdvisorName.mockReturnValue('Asesor 1');

      // Act
      const result = service.getAdvisorName(mockThesis);

      // Assert
      expect(result).toBe('Asesor 1');
      expect(formatterSpy.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });

  describe('Notificaciones', () => {
    it('debe lanzar la notificación de archivo adjunto con el nombre correcto', () => {
      // Arrange
      const fileName = 'mi_archivo.pdf';

      // Act
      service.notifyFileAttached(fileName);

      // Assert: Se evalúa el objeto completo para mayor robustez
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: `El documento ${fileName} se ha adjuntado correctamente.`,
        type: NotificationType.INFO
      });
    });

    it('debe lanzar la notificación de error por documentos faltantes con el mensaje exacto', () => {
      // Act
      service.notifyMissingDocuments();

      // Assert: Se evalúa el objeto completo para asegurar que el mensaje no se modifique accidentalmente
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Documentos faltantes',
        message: 'Debe adjuntar obligatoriamente la Monografía, el Formato_E y los Anexos para poder continuar.',
        type: NotificationType.ERROR
      });
    });
  });
});
