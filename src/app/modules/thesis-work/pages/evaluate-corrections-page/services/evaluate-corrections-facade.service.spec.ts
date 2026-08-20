import { TestBed } from '@angular/core/testing';
import { EvaluateCorrectionsFacadeService } from './evaluate-corrections-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { of, throwError } from 'rxjs';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
// ¡Importación añadida para solucionar el Error 2!
import { stateList } from '../../../../../core/enums/state.enum';

// --- Tipo Utilitario Estricto ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

describe('EvaluateCorrectionsFacadeService', () => {
  let service: EvaluateCorrectionsFacadeService;
  let thesisWorkServiceMock: jest.Mocked<ThesisWorkService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Inicialización Type-Safe de los mocks sin usar 'unknown' ni 'any'
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      evaluateCorrectedDocumentsMock: jest.fn(),
    } as DeepPartial<ThesisWorkService> as jest.Mocked<ThesisWorkService>;

    notificationServiceMock = {
      show: jest.fn(),
    } as DeepPartial<NotificationService> as jest.Mocked<NotificationService>;

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
  });

  describe('loadThesisWork', () => {
    it('debería ejecutar onSuccess cuando se encuentre el proyecto de grado', () => {
      const mockData = { id: 't1' } as DeepPartial<ThesisWork> as ThesisWork;
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockData));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('t1');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería ejecutar onError y mostrar notificación si no se encuentra data', () => {
      // CORRECCIÓN: Retornamos 'undefined', lo cual cumple perfectamente con la firma
      // Observable<ThesisWork | undefined> sin usar trucos.
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });

    it('debería ejecutar onError y mostrar notificación de error si hay fallo de red', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('t1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('saveEvaluation', () => {
    // CORRECCIÓN 2: Usamos el Enum `stateList.APROBADO` en lugar del string.
    const mockEvaluation = { veredict: stateList.APROBADO } as DeepPartial<Omit<Evaluation, 'id' | 'date'>> as Omit<Evaluation, 'id' | 'date'>;
    const mockFile = new File([''], 'test.pdf');

    it('debería ejecutar onSuccess y notificar confirmación al guardar exitosamente', () => {
      // CORRECCIÓN: 'undefined' encaja de forma nativa con Observable<void>
      thesisWorkServiceMock.evaluateCorrectedDocumentsMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.saveEvaluation('t1', mockEvaluation, mockFile, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.evaluateCorrectedDocumentsMock).toHaveBeenCalledWith('t1', mockEvaluation, mockFile);
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    });

    it('debería ejecutar onError y notificar fallo si hay error al guardar', () => {
      thesisWorkServiceMock.evaluateCorrectedDocumentsMock.mockReturnValue(throwError(() => new Error('Save error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.saveEvaluation('t1', mockEvaluation, mockFile, onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('showNavigationError', () => {
    it('debería mostrar una notificación de error de navegación', () => {
      service.showNavigationError();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });
});
