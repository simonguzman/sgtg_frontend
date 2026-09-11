// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { EvaluateCorrectionsFacadeService } from './evaluate-corrections-facade.service';

// 3. Dependencias (Servicios)
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ─────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | undefined>, [string]>;
  evaluateCorrectedDocumentsMock: jest.Mock<Observable<void>, [string, Omit<Evaluation, 'id' | 'date'>, File]>;
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
    thesisWorkId: 'mock-thesis-123',
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

const createMockEvaluationPayload = (overrides: Partial<Omit<Evaluation, 'id' | 'date'>> = {}): Omit<Evaluation, 'id' | 'date'> => ({
  documentId: 'doc-1',
  proposalId: 'prop-1',
  evaluatorId: 'u-1',
  evaluatorName: 'Jurado',
  evaluatorRole: 'JURADO',
  veredict: stateList.APROBADO,
  observations: 'Dictamen oficial favorable.',
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateCorrectionsFacadeService', () => {
  let service: EvaluateCorrectionsFacadeService;

  // Interfaces Mocks estrictas
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciar consola preventivamente
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente, sin as DeepPartial
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      evaluateCorrectedDocumentsMock: jest.fn(),
    };

    notificationServiceMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateCorrectionsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
      ],
    });

    service = TestBed.inject(EvaluateCorrectionsFacadeService);
  });

  // Limpieza vital para aislar los Spies
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('loadThesisWork', () => {
    it('debería ejecutar onSuccess cuando se encuentre el proyecto de grado', () => {
      // Arrange
      const mockData = createMockThesisWork({ thesisWorkId: 't1' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockData));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('t1');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería ejecutar onError y mostrar notificación si no se encuentra data', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();

      // Asserts de strings exactos en lugar de objectContaining
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto de grado solicitado no existe en la base de datos.',
        type: NotificationType.INFO
      });
    });

    it('debería ejecutar onError y mostrar notificación de error si hay fallo de red', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Fallo técnico',
        message: 'Error de red al intentar descargar los metadatos.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('saveEvaluation', () => {
    const mockEvaluation = createMockEvaluationPayload();
    const mockFile = new File([''], 'test.pdf');

    it('debería ejecutar onSuccess y notificar confirmación al guardar exitosamente', () => {
      // Arrange
      thesisWorkServiceMock.evaluateCorrectedDocumentsMock.mockReturnValue(of(void 0));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.saveEvaluation('t1', mockEvaluation, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.evaluateCorrectedDocumentsMock).toHaveBeenCalledWith('t1', mockEvaluation, mockFile);
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Evaluación Oficial Registrada',
        message: 'El dictamen basado en el histórico de evaluaciones ha sido procesado de forma exitosa.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debería ejecutar onError y notificar fallo si hay error al guardar', () => {
      // Arrange
      thesisWorkServiceMock.evaluateCorrectedDocumentsMock.mockReturnValue(throwError(() => new Error('Save error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.saveEvaluation('t1', mockEvaluation, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error al registrar',
        message: 'Ocurrió un problema de persistencia al guardar el dictamen del jurado.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('showNavigationError', () => {
    it('debería mostrar una notificación de error de navegación', () => {
      // Act
      service.showNavigationError();

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo mapear la información técnica del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
