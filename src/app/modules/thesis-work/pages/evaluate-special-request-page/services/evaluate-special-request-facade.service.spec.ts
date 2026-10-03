import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { EvaluateSpecialRequestFacadeService } from './evaluate-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  evaluateSpecialRequestMock: jest.Mock<Observable<void>, [string, string, { status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
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

const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-1',
  directorId: 'director-123',
  requestType: SpecialRequestType.CANCELACION,
  description: 'Razón de cancelación',
  requestDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'thesis-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [createMockSpecialRequest()],
    state: stateList.EN_REVISION,
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
        title: 'Título de prueba',
        description: 'Descripción de prueba',
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

describe('EvaluateSpecialRequestFacadeService', () => {
  let service: EvaluateSpecialRequestFacadeService;

  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  const mockThesisWork = createMockThesisWork();
  const mockRequest = mockThesisWork.specialRequests![0];

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      evaluateSpecialRequestMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSpecialRequestFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(EvaluateSpecialRequestFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Flujo de Carga: loadThesisWorkAndRequest', () => {
    it('debería llamar a onSuccess cuando el trabajo y la solicitud existen', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesisWork, mockRequest);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError si la data retorna null (comportamiento corregido sin unknown)', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de carga',
        message: 'El trabajo de grado especificado no existe.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError si la solicitud específica no se encuentra', () => {
      const workSinRequest = createMockThesisWork({ specialRequests: [] });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(workSinRequest));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-999', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de carga',
        message: 'No se encontró la solicitud especial especificada.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onError cuando la petición HTTP falla', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWorkAndRequest('thesis-1', 'req-1', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de carga',
        message: 'No se pudo recuperar la información del proyecto.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de Evaluación: processEvaluation', () => {
    const payload = { status: stateList.APROBADO as const, resolutionDetails: 'Ok' };

    it('debería notificar éxito y llamar a onSuccess', () => {
      thesisWorkServiceMock.evaluateSpecialRequestMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('thesis-1', 'req-1', payload, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.evaluateSpecialRequestMock).toHaveBeenCalledWith('thesis-1', 'req-1', payload);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Evaluación Registrada',
        message: 'La evaluación de la solicitud ha sido guardada correctamente.',
        type: NotificationType.CONFIRMATION
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error y llamar a onError cuando la API falla', () => {
      thesisWorkServiceMock.evaluateSpecialRequestMock.mockReturnValue(throwError(() => new Error('Server error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('thesis-1', 'req-1', payload, onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de Red',
        message: 'Fallo la comunicación al almacenar la evaluación.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
