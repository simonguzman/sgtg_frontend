import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { FileDownloadService, nombreConExtension, nombreEnElServidor } from './file-download.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

describe('FileDownloadService', () => {
  let service: FileDownloadService;
  let httpMock: HttpTestingController;
  let mockNotificationService: MockNotificationService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockNotificationService = {
      show: jest.fn()
    };

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
    window.URL.createObjectURL = jest.fn().mockReturnValue('blob:mock-url');
    window.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    httpMock.verify();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();

    jest.clearAllMocks();
    jest.restoreAllMocks();
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

  describe('Archivos del backend', () => {
    it('se piden siempre como blob (para enviar el token) y el nombre lleva la extensión', async () => {
      const anchor = document.createElement('a');
      jest.spyOn(anchor, 'click').mockImplementation(() => {});
      jest.spyOn(document, 'createElement').mockReturnValue(anchor);
      const url = '/api/v1/sgtg/trabajos-grado/15/archivos?ruta=15%2FTI-A%2Fv2%2FFormato%20A%20-%20v2.pdf';

      const descarga = service.download(url, 'Formato A (propuesta) – versión 2');
      httpMock.expectOne(url).flush(new Blob(['%PDF'], { type: 'application/pdf' }));
      await descarga;

      // Se descarga con el nombre que tiene en el servidor
      expect(anchor.download).toBe('Formato A - v2.pdf');
    });
  });

  describe('nombreEnElServidor', () => {
    it('toma el nombre del archivo del parámetro ruta de la URL', () => {
      expect(nombreEnElServidor('/api/v1/sgtg/trabajos-grado/20/archivos?ruta=20%2FCARTA_ACEPTACION%2Fv1%2FCarta%20de%20aceptacion%20-%20v1.pdf'))
        .toBe('Carta de aceptacion - v1.pdf');
    });

    it('sin parámetro ruta devuelve null (se usa el nombre mostrado)', () => {
      expect(nombreEnElServidor('/api/v1/sgtg/trabajos-grado/20/archivos')).toBeNull();
    });
  });

  describe('nombreConExtension', () => {
    it('agrega .pdf a un PDF sin extensión y quita la extensión repetida', () => {
      expect(nombreConExtension('propuesta', 'application/pdf')).toBe('propuesta.pdf');
      expect(nombreConExtension('propuesta.pdf.pdf', 'application/pdf')).toBe('propuesta.pdf');
      expect(nombreConExtension('acta.pdf', 'application/pdf')).toBe('acta.pdf');
      expect(nombreConExtension('datos', 'text/plain')).toBe('datos');
    });
  });

  describe('Descarga por Blob (useBlob = true)', () => {
    it('debería obtener el blob por HTTP, crear la ObjectURL y revocarla tras el delay', async () => {
      jest.useFakeTimers();
      const realAnchor = document.createElement('a');
      const clickSpy = jest.spyOn(realAnchor, 'click').mockImplementation(() => {});
      jest.spyOn(realAnchor, 'remove');
      jest.spyOn(document, 'createElement').mockReturnValue(realAnchor);
      jest.spyOn(document.body, 'appendChild');
      const testUrl = 'https://api.ejemplo.com/reporte';
      const testFileName = 'reporte-mensual.pdf';
      const downloadPromise = service.download(testUrl, testFileName, true);
      const req = httpMock.expectOne(testUrl);
      expect(req.request.method).toBe('GET');
      expect(req.request.responseType).toBe('blob');
      const mockBlob = new Blob(['contenido simulado'], { type: 'application/pdf' });
      req.flush(mockBlob);
      await downloadPromise;
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(realAnchor.href).toContain('blob:mock-url');
      expect(realAnchor.download).toBe(testFileName);
      expect(clickSpy).toHaveBeenCalled();
      expect(window.URL.revokeObjectURL).not.toHaveBeenCalled();
      jest.advanceTimersByTime(100);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('debería manejar errores HTTP notificando al usuario y registrando en consola', async () => {
      const testUrl = 'https://api.ejemplo.com/error-descarga';
      const testFileName = 'fallido.pdf';
      const downloadPromise = service.download(testUrl, testFileName, true);
      const req = httpMock.expectOne(testUrl);
      req.error(new ProgressEvent('Error de Red'));
      await downloadPromise;
      expect(console.error).toHaveBeenCalledWith('Error al descargar el archivo:', expect.any(Object));
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          message: `No fue posible descargar "${testFileName}". Verifique su conexión e inténtelo nuevamente.`,
          type: NotificationType.ERROR
        })
      );
    });
  });
});
