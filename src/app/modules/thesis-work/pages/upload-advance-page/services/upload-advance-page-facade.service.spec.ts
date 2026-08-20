import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

// Componentes y Servicios
import { UploadAdvancePageFacadeService } from './upload-advance-page-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// Interfaces
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { UploadAdvancePayload } from '../../../interfaces/advance-playload.interface';

// Mock de utilidades externas
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn().mockResolvedValue('data:application/pdf;base64,mocked_base64_string')
}));

// Interfaces estrictas para los espías (Evita el uso de as unknown)
interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock;
  uploadDocumentMock: jest.Mock;
}

interface MockNotificationService {
  show: jest.Mock;
}

describe('UploadAdvancePageFacadeService', () => {
  let service: UploadAdvancePageFacadeService;
  let thesisWorkSpy: MockThesisWorkService;
  let notificationSpy: MockNotificationService;

  beforeAll(() => {
    // Simulamos crypto.randomUUID de forma segura para entornos de prueba NodeJS/jsdom
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-1234' },
      writable: true
    });
  });

  beforeEach(() => {
    // Inicialización de espías estrictamente tipados
    thesisWorkSpy = {
      getThesisWorkByIdMock: jest.fn(),
      uploadDocumentMock: jest.fn()
    };

    notificationSpy = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UploadAdvancePageFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });

    service = TestBed.inject(UploadAdvancePageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Carga de Trabajo de Grado (loadThesisWork)', () => {
    const onSuccessMock = jest.fn();
    const onNotFoundMock = jest.fn();

    // Mock estrictamente tipado usando Partial casteado de forma segura
    const mockThesis: ThesisWork = {
      id: '123',
      thesisWorkId: '123'
    } as Partial<ThesisWork> as ThesisWork;

    it('debe llamar a onSuccess si el trabajo de grado existe', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      service.loadThesisWork('123', onSuccessMock, onNotFoundMock);

      expect(onSuccessMock).toHaveBeenCalledWith(mockThesis);
      expect(onNotFoundMock).not.toHaveBeenCalled();
      expect(notificationSpy.show).not.toHaveBeenCalled();
    });

    it('debe notificar y llamar a onNotFound si el servicio devuelve nulo o indefinido', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      service.loadThesisWork('123', onSuccessMock, onNotFoundMock);

      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onNotFoundMock).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'No encontrado',
        type: NotificationType.INFO
      }));
    });

    it('debe notificar error y llamar a onNotFound si la petición HTTP falla', () => {
      thesisWorkSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Network error')));

      service.loadThesisWork('123', onSuccessMock, onNotFoundMock);

      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onNotFoundMock).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de conexión',
        type: NotificationType.ERROR
      }));
    });
  });

  describe('Procesamiento de Avance (processAdvance)', () => {
    const onSuccessMock = jest.fn();
    const onErrorMock = jest.fn();
    const mockPayload: UploadAdvancePayload = {
      formValues: { title: 'Avance 1', comments: 'Comentarios de prueba' },
      files: [new File([''], 'test1.pdf'), new File([''], 'test2.pdf')]
    };

    it('debe procesar los archivos en paralelo y notificar éxito', async () => {
      // Mockeamos el retorno del observable como exitoso
      thesisWorkSpy.uploadDocumentMock.mockReturnValue(of(void 0));

      // IMPORTANTE: Al ser un método async/Promise, debemos usar await en el test
      await service.processAdvance('thesis-1', 'user-1', mockPayload, onSuccessMock, onErrorMock);

      // Debe llamarse 2 veces porque hay 2 archivos en el payload
      expect(thesisWorkSpy.uploadDocumentMock).toHaveBeenCalledTimes(2);
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onErrorMock).not.toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Avance registrado',
        type: NotificationType.CONFIRMATION
      }));
    });

    it('debe notificar error si alguna de las subidas falla en el forkJoin', async () => {
      // Forzamos un fallo en la subida simulando un error HTTP
      thesisWorkSpy.uploadDocumentMock.mockReturnValue(throwError(() => new Error('S3 Error')));

      await service.processAdvance('thesis-1', 'user-1', mockPayload, onSuccessMock, onErrorMock);

      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(onErrorMock).toHaveBeenCalled();
      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error al guardar',
        type: NotificationType.ERROR
      }));
    });
  });

  describe('Gestión de errores de navegación (showNavigationError)', () => {
    it('debe mostrar la notificación de error de navegación', () => {
      service.showNavigationError();

      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
