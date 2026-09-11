// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { RegisterSpecialRequestFacadeService, SpecialRequestPayload } from './register-special-request-facade.service';

// 3. Dependencias
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  createSpecialRequestMock: jest.Mock<Observable<void>, [SpecialRequestPayload & { thesisId: string }]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSpecialRequestFacadeService', () => {
  let service: RegisterSpecialRequestFacadeService;

  // Interfaces Mocks estrictas
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  // Mock fuertemente tipado e hidratado sin casteos destructivos
  const mockThesisWork = createMockThesisWork();

  beforeEach(() => {
    // 🔕 Silenciamos el console.error de forma global y preventiva para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización limpia de mocks respetando las firmas de las interfaces
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
    jest.clearAllMocks(); // Previene fugas entre tests
    jest.restoreAllMocks(); // 🧹 Fundamental: Restaura la consola original para no afectar otras suites
  });

  describe('Flujo de Carga (loadThesisWork)', () => {
    it('debería llamar a onSuccess cuando el trabajo existe', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesisWork);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onNotFound cuando la data retorna null', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      // Assert
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
      // Arrange
      const errorMock = new Error('Network error');
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      // Assert
      expect(console.error).toHaveBeenCalledWith(errorMock); // Verificamos que sí loguea, pero en silencio
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
      // Tomamos un valor dinámico del enum para evitar hardcodeo frágil
      requestData = {
        requestType: Object.values(SpecialRequestType)[0],
        comments: 'Test request comments'
      };
    });

    it('debería registrar exitosamente, notificar y llamar a onSuccess', () => {
      // Arrange
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

      // Assert
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
      // Arrange
      const errorMock = new Error('Server error');
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

      // Assert
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
