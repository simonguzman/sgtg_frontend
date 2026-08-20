import { TestBed } from '@angular/core/testing';
import { EvaluateSustentationFacadeService } from './evaluate-sustentation-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { of, throwError } from 'rxjs';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';

describe('EvaluateSustentationFacadeService', () => {
  let service: EvaluateSustentationFacadeService;
  let thesisWorkServiceMock: jest.Mocked<ThesisWorkService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Configuración estricta de mocks usando jest.Mocked
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      registerSustentationVerdictMock: jest.fn()
    } as unknown as jest.Mocked<ThesisWorkService>;

    notificationServiceMock = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

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
  });

  describe('loadThesisWork', () => {
    it('debería invocar onSuccess si se carga el proyecto correctamente', () => {
      const mockThesis = { thesisWorkId: '123' } as ThesisWork;
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería invocar onError si el servicio retorna undefined', () => {
      // Se utiliza undefined para cumplir con el tipo Observable<ThesisWork | undefined>
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación y llamar onError si falla la petición HTTP', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de carga',
          type: NotificationType.ERROR
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe('processEvaluation', () => {
    const mockFile = new File([''], 'test.pdf');
    const mockPayload: SustentationEvaluationPayload = {
      veredict: stateList.NO_APROBADO,
      observations: '',
      evaluationDate: new Date()
    };

    it('debería registrar el veredicto, mostrar notificación específica y llamar onSuccess', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.registerSustentationVerdictMock).toHaveBeenCalledWith('123', mockPayload, mockFile);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sustentación No Aprobada',
          type: NotificationType.ERROR
        })
      );
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería usar la notificación por defecto si el veredicto no está en el config map', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));
      const defaultPayload: SustentationEvaluationPayload = {
        ...mockPayload,
        veredict: stateList.APROBADO
      };

      service.processEvaluation('123', defaultPayload, mockFile, jest.fn(), jest.fn());

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Sustentación Evaluada',
          type: NotificationType.CONFIRMATION
        })
      );
    });

    it('debería mostrar notificación de error y llamar onError si falla la petición', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(throwError(() => new Error('Net error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de Red',
          type: NotificationType.ERROR
        })
      );
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
