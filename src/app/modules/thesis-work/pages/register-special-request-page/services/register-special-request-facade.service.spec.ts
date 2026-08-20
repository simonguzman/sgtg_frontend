import { TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestFacadeService, SpecialRequestPayload } from './register-special-request-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { of, throwError } from 'rxjs';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';

// --- Interfaces para Mocks Estrictos (Cero ANY y Cero Castings Forzados) ---
interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock;
  createSpecialRequestMock: jest.Mock;
}

interface MockNotificationService {
  show: jest.Mock;
}

describe('RegisterSpecialRequestFacadeService', () => {
  let service: RegisterSpecialRequestFacadeService;
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  // Mock fuertemente tipado sin unknown
  const mockThesisWork = { thesisWorkId: '123', state: stateList.EN_DESARROLLO } as ThesisWork;

  beforeEach(() => {
    // Inicialización limpia de mocks
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

    // Silenciamos el console.error para no ensuciar la terminal al probar los flujos de error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Flujo de Carga (loadThesisWork)', () => {
    it('debería llamar a onSuccess cuando el trabajo existe', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesisWork));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      // Aserción agregada: Verificar que se llamó al backend con el ID correcto
      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');

      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesisWork);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y llamar a onNotFound cuando la data retorna null', () => {
      // Simula el escenario donde el backend retorna null
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El trabajo de grado especificado no existe.',
        type: NotificationType.ERROR
      });
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar, hacer console.error y llamar a onError cuando la petición falla', () => {
      const errorMock = new Error('Network error');
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onNotFoundSpy, onErrorSpy);

      expect(console.error).toHaveBeenCalledWith(errorMock);
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
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

      // Verificamos que el payload se formó correctamente (combinando data + thesisId)
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

    it('debería notificar error, hacer console.error y llamar a onError cuando el guardado falla', () => {
      const errorMock = new Error('Server error');
      thesisWorkServiceMock.createSpecialRequestMock.mockReturnValue(throwError(() => errorMock));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSaveRequest('123', requestData, onSuccessSpy, onErrorSpy);

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
