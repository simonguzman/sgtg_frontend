// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { EvaluateSustentationFacadeService } from './evaluate-sustentation-facade.service';

// 3. Dependencias (Servicios)
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | undefined>, [string]>;
  registerSustentationVerdictMock: jest.Mock<Observable<void>, [string, SustentationEvaluationPayload, File]>;
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
  codeNumber: 1234567890, // Aprendido e integrado
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123', // Aprendido e integrado en la raíz
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

const createMockEvaluationPayload = (overrides: Partial<SustentationEvaluationPayload> = {}): SustentationEvaluationPayload => ({
  veredict: stateList.NO_APROBADO,
  observations: '',
  evaluationDate: new Date('2026-08-24T10:00:00'),
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateSustentationFacadeService', () => {
  let service: EvaluateSustentationFacadeService;

  // Mocks con contratos estrictos
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos garantizando las firmas
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      registerSustentationVerdictMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSustentationFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(EvaluateSustentationFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería invocar onSuccess si se carga el proyecto correctamente', () => {
      // Arrange
      const mockThesis = createMockThesisWork({ thesisWorkId: '123' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería invocar onError si el servicio retorna undefined', () => {
      // Arrange
      // El tipado estricto permite undefined gracias a `Observable<ThesisWork | undefined>`
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación y llamar onError si falla la petición HTTP', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de carga',
        message: 'No se pudo recuperar la información del proyecto.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Proceso de Evaluación (processEvaluation)', () => {
    const mockFile = new File([''], 'test.pdf');
    const mockPayload = createMockEvaluationPayload();

    it('debería registrar el veredicto, mostrar notificación específica y llamar onSuccess', () => {
      // Arrange
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.registerSustentationVerdictMock).toHaveBeenCalledWith('123', mockPayload, mockFile);

      // Hacemos el Assert exacto del string en lugar de objectContaining
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Sustentación No Aprobada',
        message: `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${stateList.NO_APROBADO}].`,
        type: NotificationType.ERROR
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería usar la notificación por defecto si el veredicto no está en el config map', () => {
      // Arrange
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));

      // Sobreescribimos el veredicto por uno que usa la configuración por defecto
      const defaultPayload = createMockEvaluationPayload({ veredict: stateList.APROBADO });

      // Act
      service.processEvaluation('123', defaultPayload, mockFile, jest.fn(), jest.fn());

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Sustentación Evaluada',
        message: `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${stateList.APROBADO}].`,
        type: NotificationType.CONFIRMATION
      });
    });

    it('debería mostrar notificación de error y llamar onError si falla la petición', () => {
      // Arrange
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(throwError(() => new Error('Net error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
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
