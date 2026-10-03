import { TestBed } from '@angular/core/testing';
import { EvaluateSpecialRequestFormService } from './evaluate-special-request-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { stateList } from '../../../../../core/enums/state.enum';

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockThesisParticipantsFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
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

describe('EvaluateSpecialRequestFormService', () => {
  let service: EvaluateSpecialRequestFormService;

  let notificationServiceMock: MockNotificationService;
  let participantsFormatterMock: MockThesisParticipantsFormatterService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Delegación de participantes', () => {
    it('debería retornar el nombre del estudiante', () => {
      expect(service.getStudentNames(mockThesisWork)).toBe('Estudiante Prueba');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del director', () => {
      expect(service.getDirectorName(mockThesisWork)).toBe('Director Prueba');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del codirector', () => {
      expect(service.getCodirectorName(mockThesisWork)).toBe('Codirector Prueba');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del asesor', () => {
      expect(service.getAdvisorName(mockThesisWork)).toBe('Asesor Prueba');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Notificaciones', () => {
    it('notifyMissingVerdict debería mostrar un error de falta de calificación', () => {
      service.notifyMissingVerdict();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Falta calificación',
        message: 'Debe seleccionar si la solicitud cumple o no con los requisitos.',
        type: NotificationType.ERROR
      });
    });

    it('notifyMissingDeadline debería mostrar un error de fecha requerida', () => {
      service.notifyMissingDeadline();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Fecha requerida',
        message: 'Debe asignar la nueva fecha límite de entrega para autorizar la solicitud.',
        type: NotificationType.ERROR
      });
    });
  });
});
