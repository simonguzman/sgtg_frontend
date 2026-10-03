import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { RegisterCorrectedDocumentsFacadeService } from './register-corrected-documents-facade.service';
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
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  uploadCorrectedDocumentsMock: jest.Mock<Observable<void>, [string, File, File]>;
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

describe('RegisterCorrectedDocumentsFacadeService', () => {
  let service: RegisterCorrectedDocumentsFacadeService;

  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      uploadCorrectedDocumentsMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterCorrectedDocumentsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería ejecutar onSuccess si el proyecto se carga correctamente', () => {
      const mockThesis = createMockThesisWork({ thesisWorkId: '123' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y ejecutar onError si el servicio retorna nulo', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto solicitado no existe.',
        type: NotificationType.INFO
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error técnico y ejecutar onError si falla la petición', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de conexión',
        message: 'Fallo técnico al recuperar los datos.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Carga de Correcciones (processCorrectedDocuments)', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), annexes: new File([''], 'a.zip') };

    it('debería notificar éxito y ejecutar onSuccess si se guardan los documentos', () => {
      thesisWorkServiceMock.uploadCorrectedDocumentsMock.mockReturnValue(of(void 0));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrectedDocuments('123', mockFiles, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.uploadCorrectedDocumentsMock).toHaveBeenCalledWith('123', mockFiles.monograph, mockFiles.annexes);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: '¡Documentos Registrados!',
        message: 'La monografía corregida ha sido cargada exitosamente.',
        type: NotificationType.CONFIRMATION
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error y ejecutar onError si falla la subida', () => {
      thesisWorkServiceMock.uploadCorrectedDocumentsMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrectedDocuments('123', mockFiles, onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'No se pudo guardar la documentación corregida.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Navegación Fallida (showNavigationError)', () => {
    it('debería mostrar la notificación de error de navegación', () => {
      service.showNavigationError();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
