import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FileDownloadService } from './file-download.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let httpMock: HttpTestingController;
  let mockNotificationService: jest.Mocked<NotificationService>;

  beforeEach(() => {
    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    TestBed.configureTestingModule({
      providers: [
        FileDownloadService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: mockNotificationService }
      ]
    });

    service = TestBed.inject(FileDownloadService);
    httpMock = TestBed.inject(HttpTestingController);

    // Mockeamos métodos globales de URL que JSDOM no soporta
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();

    // Espiamos console.error para mantener limpia la consola durante los tests de error
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    httpMock.verify();
    jest.restoreAllMocks();
    // Limpiamos los timers falsos de Jest para no afectar otras pruebas
    jest.useRealTimers();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Descarga Directa (useBlob = false)', () => {
    it('debería crear un enlace <a>, agregarlo al DOM, simular el clic y removerlo', () => {
      const realAnchor = document.createElement('a');
      const clickSpy = jest.spyOn(realAnchor, 'click').mockImplementation(() => {});
      const removeSpy = jest.spyOn(realAnchor, 'remove');

      const createElementSpy = jest.spyOn(document, 'createElement').mockReturnValue(realAnchor);
      const appendChildSpy = jest.spyOn(document.body, 'appendChild');

      const testUrl = 'https://ejemplo.com/archivo.pdf';
      const testFileName = 'archivo.pdf';

      service.download(testUrl, testFileName, false);

      expect(createElementSpy).toHaveBeenCalledWith('a');
      expect(realAnchor.href).toBe(testUrl);
      expect(realAnchor.download).toBe(testFileName);
      expect(realAnchor.target).toBe('_blank');

      expect(appendChildSpy).toHaveBeenCalledWith(realAnchor);
      expect(clickSpy).toHaveBeenCalled();
      expect(removeSpy).toHaveBeenCalled();
    });
  });

  describe('Descarga por Blob (useBlob = true)', () => {
    // Nota el cambio a "async () =>" en lugar de "fakeAsync(() =>)"
    it('debería obtener el blob por HTTP, crear la ObjectURL y revocarla tras el delay', async () => {
      // Activamos los fake timers de Jest para controlar el setTimeout
      jest.useFakeTimers();

      const realAnchor = document.createElement('a');
      const clickSpy = jest.spyOn(realAnchor, 'click').mockImplementation(() => {});
      jest.spyOn(realAnchor, 'remove');

      jest.spyOn(document, 'createElement').mockReturnValue(realAnchor);
      jest.spyOn(document.body, 'appendChild');

      const testUrl = 'https://api.ejemplo.com/reporte';
      const testFileName = 'reporte-mensual.pdf';

      // 1. Ejecutamos el servicio, pero NO le hacemos "await" inmediatamente.
      // Guardamos la promesa en una variable para esperarla después de resolver el HTTP Mock.
      const downloadPromise = service.download(testUrl, testFileName, true);

      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');

      const mockBlob = new Blob(['contenido simulado'], { type: 'application/pdf' });

      // 2. Entregamos la respuesta exitosa al mock http
      req.flush(mockBlob);

      // 3. Ahora sí esperamos a que el método nativo asíncrono del servicio termine de ejecutarse
      await downloadPromise;

      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(realAnchor.href).toContain('blob:mock-url');
      expect(realAnchor.download).toBe(testFileName);
      expect(clickSpy).toHaveBeenCalled();

      // En este punto, la Object URL aún no debería ser revocada
      expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();

      // 4. Avanzamos el tiempo específicamente para que el setTimeout se dispare
      jest.advanceTimersByTime(100);

      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('debería manejar errores HTTP notificando al usuario y registrando en consola', async () => {
      const testUrl = 'https://api.ejemplo.com/error-descarga';
      const testFileName = 'fallido.pdf';

      const downloadPromise = service.download(testUrl, testFileName, true);

      const req = httpMock.expectOne(testUrl);

      // Simulamos un error de red
      req.error(new ProgressEvent('Error de Red'));

      // Esperamos que el bloque "catch" del servicio se ejecute por completo
      await downloadPromise;

      expect(console.error).toHaveBeenCalledWith('Error al descargar el archivo:', expect.any(Object));
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: `No fue posible descargar "${testFileName}". Verifique su conexión e inténtelo nuevamente.`,
        type: NotificationType.ERROR
      });
    });
  });
});
