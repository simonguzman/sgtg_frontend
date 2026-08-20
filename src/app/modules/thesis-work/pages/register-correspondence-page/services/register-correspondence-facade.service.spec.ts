import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { RegisterCorrespondenceFacadeService } from './register-correspondence-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { of, throwError } from 'rxjs';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

// Mock de la función helper de fechas
jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('30/07/2026')
}));

// Mock del lector de archivos
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

describe('RegisterCorrespondenceFacadeService', () => {
  let service: RegisterCorrespondenceFacadeService;

  // Eliminado el "as unknown" - tipado estricto
  let thesisWorkServiceMock: {
    getThesisWorkByIdMock: jest.Mock;
    registerCorrespondenceDocumentMock: jest.Mock;
  };
  let notificationServiceMock: {
    show: jest.Mock;
  };

  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('1234abcd-5678-efgh') }
    });
  });

  beforeEach(() => {
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      registerCorrespondenceDocumentMock: jest.fn(),
    };

    notificationServiceMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrespondenceFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterCorrespondenceFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadThesisWork', () => {
    it('debería ejecutar onSuccess cuando se encuentra el trabajo de grado', () => {
      const mockData = { thesisWorkId: 'tw-1' } as unknown as ThesisWork;
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockData));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería mostrar error y ejecutar onError si el trabajo no existe (data nulo)', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });

    it('debería mostrar error y ejecutar onError si la petición falla', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('API Error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('processCorrespondence', () => {
    const mockFile = new File([''], 'resolucion.pdf', { type: 'application/pdf' });
    const mockBase64Url = 'data:application/pdf;base64,mockedContent123';

    it('debería construir el payload correctamente y ejecutar onSuccess en éxito', fakeAsync(() => {
      // Configuramos los mocks de éxito
      (readFileAsDataUrl as jest.Mock).mockResolvedValue(mockBase64Url);
      thesisWorkServiceMock.registerCorrespondenceDocumentMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);

      // tick() avanza el tiempo simulado para resolver la promesa del readFileAsDataUrl convertida a Observable
      tick();

      const expectedDocument: FileDocument = {
        id: '1234abcd-5678-efgh',
        name: 'resolucion',
        url: mockBase64Url, // La URL ahora refleja el base64 del util, no la ruta falsa de antes
        uploadDate: '30/07/2026',
        type: DocumentType.FORMATO_H,
        status: stateList.APROBADO
      };

      expect(thesisWorkServiceMock.registerCorrespondenceDocumentMock).toHaveBeenCalledWith('tw-1', expectedDocument);
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
    }));

    it('debería ejecutar onError y mostrar notificación si falla la lectura del archivo', fakeAsync(() => {
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('File Read Error'));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);
      tick();

      // Aseguramos que nunca intentó guardar en la API
      expect(thesisWorkServiceMock.registerCorrespondenceDocumentMock).not.toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al leer el archivo', type: NotificationType.ERROR })
      );
    }));

    it('debería ejecutar onError y mostrar notificación de error si el guardado en API falla', fakeAsync(() => {
      (readFileAsDataUrl as jest.Mock).mockResolvedValue(mockBase64Url);
      thesisWorkServiceMock.registerCorrespondenceDocumentMock.mockReturnValue(throwError(() => new Error('Save Error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);
      tick();

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error en guardado', type: NotificationType.ERROR })
      );
    }));
  });

  describe('showNavigationError', () => {
    it('debería llamar a notificationService con el error de navegación', () => {
      service.showNavigationError();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Identificador faltante',
          type: NotificationType.ERROR
        })
      );
    });
  });
});
