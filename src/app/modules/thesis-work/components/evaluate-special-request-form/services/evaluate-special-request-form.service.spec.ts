// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';

// 2. Servicio a probar
import { EvaluateSpecialRequestFormService } from './evaluate-special-request-form.service';

// 3. Dependencias (Servicios)
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { stateList } from '../../../../../core/enums/state.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockThesisParticipantsFormatterService {
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
    thesisWorkId: 'thesis-mock-123',
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

describe('EvaluateSpecialRequestFormService', () => {
  let service: EvaluateSpecialRequestFormService;

  // Interfaces Mocks estrictas
  let notificationServiceMock: MockNotificationService;
  let participantsFormatterMock: MockThesisParticipantsFormatterService;

  // Mock validado directamente mediante la fábrica
  const mockThesisWork = createMockThesisWork();

  beforeEach(() => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización de mocks limpios y estrictos
    notificationServiceMock = {
      show: jest.fn()
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getDirectorName: jest.fn().mockReturnValue('Director Prueba'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Prueba'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Prueba')
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSpecialRequestFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(EvaluateSpecialRequestFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Prevenir fugas entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola para no silenciar otros archivos
  });

  describe('Delegación de participantes', () => {
    it('debería retornar el nombre del estudiante', () => {
      // Act & Assert
      expect(service.getStudentNames(mockThesisWork)).toBe('Estudiante Prueba');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del director', () => {
      // Act & Assert
      expect(service.getDirectorName(mockThesisWork)).toBe('Director Prueba');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del codirector', () => {
      // Act & Assert
      expect(service.getCodirectorName(mockThesisWork)).toBe('Codirector Prueba');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del asesor', () => {
      // Act & Assert
      expect(service.getAdvisorName(mockThesisWork)).toBe('Asesor Prueba');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Notificaciones', () => {
    it('notifyMissingVerdict debería mostrar un error de falta de calificación', () => {
      // Act
      service.notifyMissingVerdict();

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Falta calificación',
        message: 'Debe seleccionar si la solicitud cumple o no con los requisitos.',
        type: NotificationType.ERROR
      });
    });

    it('notifyMissingDeadline debería mostrar un error de fecha requerida', () => {
      // Act
      service.notifyMissingDeadline();

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Fecha requerida',
        message: 'Debe asignar la nueva fecha límite de entrega para autorizar la solicitud.',
        type: NotificationType.ERROR
      });
    });
  });
});
