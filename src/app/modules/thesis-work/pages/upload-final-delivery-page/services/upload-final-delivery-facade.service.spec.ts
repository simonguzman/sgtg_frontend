import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { UploadFinalDeliveryFacadeService } from './upload-final-delivery-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null>, [string]>;
  uploadFinalDeliveryMock: jest.Mock<Observable<void>, [string, File, File, File | undefined]>;
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

describe('UploadFinalDeliveryFacadeService', () => {
  let service: UploadFinalDeliveryFacadeService;

  let thesisWorkServiceSpy: MockThesisWorkService;
  let notificationServiceSpy: MockNotificationService;

  const mockThesis = createMockThesisWork({ thesisWorkId: 'thesis-123' });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceSpy = {
      getThesisWorkByIdMock: jest.fn(),
      uploadFinalDeliveryMock: jest.fn()
    };

    notificationServiceSpy = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UploadFinalDeliveryFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(UploadFinalDeliveryFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Carga de Trabajo de Grado (loadThesisWork)', () => {
    it('debe ejecutar onSuccess cuando se encuentra la tesis', () => {
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      expect(thesisWorkServiceSpy.getThesisWorkByIdMock).toHaveBeenCalledWith('thesis-123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
    });

    it('debe notificar "No encontrado" y ejecutar onNotFound si los datos son nulos/indefinidos', () => {
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      service.loadThesisWork('invalid-id', onSuccessSpy, onNotFoundSpy);

      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto solicitado no existe.',
        type: NotificationType.INFO
      });
    });

    it('debe notificar "Error de conexión" y ejecutar onNotFound en caso de error HTTP/Observable', () => {
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Net Error')));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de conexión',
        message: 'Fallo técnico al recuperar los datos.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Proceso de Entrega Final (processFinalDelivery)', () => {
    const mockFiles = {
      monograph: new File([], 'm.pdf'),
      formatE: new File([], 'f.pdf'),
      annexes: new File([], 'a.pdf')
    };

    it('debe notificar éxito y llamar a onSuccess cuando se guarda la entrega correctamente', () => {
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceSpy.uploadFinalDeliveryMock).toHaveBeenCalledWith(
        'thesis-123',
        mockFiles.monograph,
        mockFiles.formatE,
        mockFiles.annexes
      );
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: '¡Entrega Registrada!',
        message: 'La monografía, el Formato_E y los anexos se han procesado de manera oficial.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debe notificar error y llamar a onError si falla la carga de la entrega', () => {
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(throwError(() => new Error('Error de servidor')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'No se pudo guardar la entrega final.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Errores de Navegación (showNavigationError)', () => {
    it('debe mostrar la notificación con título "Error de navegación" y el mensaje correcto', () => {
      service.showNavigationError();

      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
