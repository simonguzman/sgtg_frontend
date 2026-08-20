import { TestBed } from '@angular/core/testing';
import { RegisterPazYSalvoFacadeService } from './register-paz-y-salvo-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../../interfaces/paz-y-salvo-playload.interface';
import { of, throwError } from 'rxjs';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('RegisterPazYSalvoFacadeService', () => {
  let service: RegisterPazYSalvoFacadeService;

  // Tipado estricto de los mocks de los servicios
  let mockThesisWorkService: {
    getThesisWorkByIdMock: jest.Mock;
    registerPazYSalvoMock: jest.Mock;
  };

  let mockNotificationService: {
    show: jest.Mock;
  };

  beforeEach(() => {
    // Arrange: Inicialización limpia de mocks
    mockThesisWorkService = {
      getThesisWorkByIdMock: jest.fn(),
      registerPazYSalvoMock: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterPazYSalvoFacadeService,
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(RegisterPazYSalvoFacadeService);
  });

  afterEach(() => {
    // Garantiza que no queden llamados residuales entre los `it`
    jest.clearAllMocks();
  });

  describe('loadThesisWork', () => {
    it('debería ejecutar onSuccess con los datos si la petición es exitosa', () => {
      // Arrange
      const mockData: DeepPartial<ThesisWork> = { thesisWorkId: '123' };
      // Usamos 'as ThesisWork' seguro porque mockData ya está validado por DeepPartial
      mockThesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(mockData as ThesisWork));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería ejecutar onError si la petición devuelve un error', () => {
      // Arrange
      mockThesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de conexión')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('processPazYSalvo', () => {
    const mockFile = new File([''], 'test.pdf');
    let onSuccessSpy: jest.Mock;
    let onErrorSpy: jest.Mock;

    beforeEach(() => {
      onSuccessSpy = jest.fn();
      onErrorSpy = jest.fn();
    });

    it('debería notificar CONFIRMATION y llamar onSuccess si aprueba todo', () => {
      // Arrange
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(of(undefined));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: true,
        financialComments: ''
      };

      // Act
      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Paz y Salvo Aprobado',
        type: NotificationType.CONFIRMATION
      }));
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar INFO y llamar onSuccess si alguna evaluación no se aprueba', () => {
      // Arrange
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(of(undefined));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: false, // Simulamos el rechazo
        financialComments: ''
      };

      // Act
      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Paz y Salvo No Aprobado',
        type: NotificationType.INFO
      }));
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar ERROR y llamar onError si la petición falla', () => {
      // Arrange
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(throwError(() => new Error('Fallo en el servidor')));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: true,
        financialComments: ''
      };

      // Act
      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        type: NotificationType.ERROR
      }));
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });
});
