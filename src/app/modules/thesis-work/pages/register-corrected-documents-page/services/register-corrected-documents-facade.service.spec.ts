import { TestBed } from '@angular/core/testing';
import { RegisterCorrectedDocumentsFacadeService } from './register-corrected-documents-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { of, throwError } from 'rxjs';

describe('RegisterCorrectedDocumentsFacadeService', () => {
  let service: RegisterCorrectedDocumentsFacadeService;
  let thesisWorkServiceMock: jest.Mocked<ThesisWorkService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;

  beforeEach(() => {
    // Definición estricta de mocks sin usar "any"
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      uploadCorrectedDocumentsMock: jest.fn()
    } as unknown as jest.Mocked<ThesisWorkService>;

    notificationServiceMock = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterCorrectedDocumentsFacadeService);
  });

  // LIMPIEZA VITAL: Previene que el historial de llamadas de un test contamine al siguiente
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadThesisWork', () => {
    it('debería ejecutar onSuccess si el proyecto se carga correctamente', () => {
      const mockThesis = { thesisWorkId: '123' } as ThesisWork;
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y ejecutar onError si el servicio retorna nulo o indefinido', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null as unknown as ThesisWork));

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

  describe('processCorrectedDocuments', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), annexes: new File([''], 'a.zip') };

    it('debería notificar éxito y ejecutar onSuccess si se guardan los documentos', () => {
      thesisWorkServiceMock.uploadCorrectedDocumentsMock.mockReturnValue(of(undefined));

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

  describe('showNavigationError', () => {
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
