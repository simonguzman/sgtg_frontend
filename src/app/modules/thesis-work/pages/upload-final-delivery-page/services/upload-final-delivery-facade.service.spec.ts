import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { UploadFinalDeliveryFacadeService } from './upload-final-delivery-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('UploadFinalDeliveryFacadeService', () => {
  let service: UploadFinalDeliveryFacadeService;

  // Tipado estricto de espías sin usar casteos 'unknown'
  let thesisWorkServiceSpy: {
    getThesisWorkByIdMock: jest.Mock;
    uploadFinalDeliveryMock: jest.Mock;
  };

  let notificationServiceSpy: {
    show: jest.Mock;
  };

  const mockThesis: DeepPartial<ThesisWork> = { thesisWorkId: 'thesis-123' };

  beforeEach(() => {
    // Arrange general: Inicialización de espías
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
  });

  describe('loadThesisWork()', () => {
    it('debe ejecutar onSuccess cuando se encuentra la tesis', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(thesisWorkServiceSpy.getThesisWorkByIdMock).toHaveBeenCalledWith('thesis-123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
    });

    it('debe notificar "No encontrado" y ejecutar onNotFound si los datos son nulos/indefinidos', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('invalid-id', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto solicitado no existe.',
        type: NotificationType.INFO
      });
    });

    it('debe notificar "Error de conexión" y ejecutar onNotFound en caso de error HTTP/Observable', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Net Error')));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de conexión',
        message: 'Fallo técnico al recuperar los datos.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('processFinalDelivery()', () => {
    const mockFiles = {
      monograph: new File([], 'm.pdf'),
      formatE: new File([], 'f.pdf'),
      annexes: new File([], 'a.pdf')
    };

    it('debe notificar éxito y llamar a onSuccess cuando se guarda la entrega correctamente', () => {
      // Arrange
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
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
      // Arrange
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(throwError(() => new Error('Error de servidor')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'No se pudo guardar la entrega final.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('showNavigationError()', () => {
    it('debe mostrar la notificación con título "Error de navegación" y el mensaje correcto', () => {
      // Act
      service.showNavigationError();

      // Assert
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
