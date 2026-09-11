// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

// 2. Servicio a probar
import { RegisterSpecialRequestFormService } from './register-special-request-form.service';

// 3. Dependencias (Servicios)
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { stateList } from '../../../../../core/enums/state.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

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
    thesisWorkId: 'TW-001',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSpecialRequestFormService', () => {
  let service: RegisterSpecialRequestFormService;

  // Interfaces Mocks estrictas
  let notificationMock: MockNotificationService;
  let participantsFormatterMock: MockParticipantsFormatterService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva y global
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización de mocks limpia y estructuralmente definida
    notificationMock = {
      show: jest.fn(),
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule], // Necesario para inyectar FormBuilder
      providers: [
        RegisterSpecialRequestFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(RegisterSpecialRequestFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Evitar contaminación
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Configuración del Formulario', () => {
    it('debería exponer las opciones de solicitudes basadas en el enum', () => {
      // Assert
      expect(service.requestOptions).toEqual(Object.values(SpecialRequestType));
      expect(service.requestOptions.length).toBeGreaterThan(0);
    });

    it('debería inicializar el formulario con campos vacíos e inválidos por defecto', () => {
      // Arrange
      const form = service.form;

      // Assert
      expect(form.get('requestType')?.value).toBe('');
      expect(form.get('comments')?.value).toBe('');
      expect(form.invalid).toBe(true);
    });

    it('debería marcar los campos como requeridos', () => {
      // Arrange
      const form = service.form;

      // Act
      form.patchValue({ requestType: '', comments: '' });

      // Assert
      expect(form.get('requestType')?.hasError('required')).toBe(true);
      expect(form.get('comments')?.hasError('required')).toBe(true);
    });

    it('debería ser válido cuando se llenan los datos correctamente', () => {
      // Arrange
      const form = service.form;
      const validEnumVal = Object.values(SpecialRequestType)[0];

      // Act
      form.patchValue({
        requestType: validEnumVal,
        comments: 'Justificación válida de prueba'
      });

      // Assert
      expect(form.valid).toBe(true);
    });
  });

  describe('Delegación a ThesisParticipantsFormatterService', () => {
    // 💡 Uso de fábrica tipada 100% libre de "as ThesisWork"
    const mockThesis = createMockThesisWork();

    it('debería obtener nombres de estudiantes delegando al servicio formateador', () => {
      // Arrange
      participantsFormatterMock.getStudentNames.mockReturnValue('Juan Perez');

      // Act
      const result = service.getStudentNames(mockThesis);

      // Assert
      expect(result).toBe('Juan Perez');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del director delegando al servicio formateador', () => {
      // Arrange
      participantsFormatterMock.getDirectorName.mockReturnValue('Dr. Smith');

      // Act
      const result = service.getDirectorName(mockThesis);

      // Assert
      expect(result).toBe('Dr. Smith');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del codirector delegando al servicio formateador', () => {
      // Arrange
      participantsFormatterMock.getCodirectorName.mockReturnValue('Dr. Doe');

      // Act
      const result = service.getCodirectorName(mockThesis);

      // Assert
      expect(result).toBe('Dr. Doe');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del asesor delegando al servicio formateador', () => {
      // Arrange
      participantsFormatterMock.getAdvisorName.mockReturnValue('MSc. Gomez');

      // Act
      const result = service.getAdvisorName(mockThesis);

      // Assert
      expect(result).toBe('MSc. Gomez');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });

  describe('Notificaciones de la UI', () => {
    it('debería mostrar notificación de error exacta cuando el formulario esté incompleto', () => {
      // Act
      service.notifyIncompleteForm();

      // Assert
      expect(notificationMock.show).toHaveBeenCalledTimes(1);
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Por favor, seleccione un tipo de solicitud e incluya la justificación requerida.',
        type: NotificationType.ERROR
      });
    });
  });
});
