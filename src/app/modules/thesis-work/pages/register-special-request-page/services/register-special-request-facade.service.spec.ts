import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { RegisterSpecialRequestFacadeService, SpecialRequestPayload } from './register-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  createSpecialRequestMock: jest.Mock<Observable<void>, [SpecialRequestPayload & { thesisId: string }]>;
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

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: '123',
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

describe('RegisterSpecialRequestFacadeService', () => {
  let service: RegisterSpecialRequestFacadeService;

  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      createSpecialRequestMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterSpecialRequestFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterSpecialRequestFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Flujo de Carga (loadThesisWork)', () => {
    it('debería llamar a onSuccess cuando el trabajo existe', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesisWork);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onNotFound cuando la data retorna null', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El trabajo de grado especificado no existe.',
        type: NotificationType.ERROR
      });
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar, registrar el error y llamar a onError cuando la petición falla', () => {
      const errorMock = new Error('Network error');
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      expect(console.error).toHaveBeenCalledWith(errorMock);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se pudo cargar la información del trabajo de grado.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onNotFoundSpy).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de Guardado (processSaveRequest)', () => {
    let requestData: SpecialRequestPayload;

    beforeEach(() => {
      requestData = {
        requestType: Object.values(SpecialRequestType)[0],
        comments: 'Test request comments'
      };
    });

    it('debería registrar exitosamente, notificar y llamar a onSuccess', () => {
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.createSpecialRequestMock).toHaveBeenCalledWith({
        ...requestData,
        thesisId: '123'
      });
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Éxito',
        message: 'La solicitud especial ha sido registrada correctamente.',
        type: NotificationType.CONFIRMATION
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error, registrar en consola y llamar a onError cuando el guardado falla', () => {
      const errorMock = new Error('Server error');
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

      expect(console.error).toHaveBeenCalledWith(errorMock);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'Hubo un problema registrando la solicitud. Intente nuevamente.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
