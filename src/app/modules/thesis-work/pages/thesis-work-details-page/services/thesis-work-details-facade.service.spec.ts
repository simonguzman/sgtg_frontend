import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ThesisWorkDetailsFacadeService } from './thesis-work-details-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';

import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';

describe('ThesisWorkDetailsFacadeService', () => {
  let service: ThesisWorkDetailsFacadeService;

  // Tipado estricto para los mocks sin usar "any" ni aserciones en cadena complejas
  let routerSpy: jest.Mocked<Partial<Router>>;
  let thesisServiceSpy: jest.Mocked<Partial<ThesisWorkService>>;
  let mapperSpy: jest.Mocked<Partial<ThesisWorkDetailsMapperService>>;
  let downloadSpy: jest.Mocked<Partial<FileDownloadService>>;
  let notificationSpy: jest.Mocked<Partial<NotificationService>>;

  beforeEach(() => {
    routerSpy = { navigate: jest.fn(), url: '/thesis-work/details' };
    thesisServiceSpy = { getThesisWorkByIdMock: jest.fn() };
    mapperSpy = { mapToView: jest.fn() };
    downloadSpy = { download: jest.fn() };
    notificationSpy = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkDetailsFacadeService,
        { provide: Router, useValue: routerSpy },
        { provide: ThesisWorkService, useValue: thesisServiceSpy },
        { provide: ThesisWorkDetailsMapperService, useValue: mapperSpy },
        { provide: FileDownloadService, useValue: downloadSpy },
        { provide: NotificationService, useValue: notificationSpy }
      ]
    });
    service = TestBed.inject(ThesisWorkDetailsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadThesisWorkDetails', () => {
    it('debería cargar los detalles y mapearlos exitosamente', () => {
      // FIX: Cambiamos 'id' por 'thesisWorkId' para que coincida con tu interfaz real
      const mockData: Partial<ThesisWork> = { thesisWorkId: '1' };
      const mockView: Partial<ThesisWorkDetailsView> = { id: '1', title: 'Test Title' };

      // Configuración de los retornos
      (thesisServiceSpy.getThesisWorkByIdMock as jest.Mock).mockReturnValue(of(mockData as ThesisWork));
      (mapperSpy.mapToView as jest.Mock).mockReturnValue(mockView as ThesisWorkDetailsView);

      // Act
      service.loadThesisWorkDetails('1');

      // Assert
      expect(service.isLoading()).toBe(false);
      expect(service.details()).toEqual(mockView);
      expect(mapperSpy.mapToView).toHaveBeenCalledWith(mockData);
    });

    it('debería notificar y regresar (goBack) si no encuentra el registro', () => {
      (thesisServiceSpy.getThesisWorkByIdMock as jest.Mock).mockReturnValue(of(null));

      service.loadThesisWorkDetails('invalid-id');

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(routerSpy.navigate).toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
    });

    it('debería manejar errores de la API, notificar y regresar', () => {
      (thesisServiceSpy.getThesisWorkByIdMock as jest.Mock).mockReturnValue(throwError(() => new Error('API Error')));

      service.loadThesisWorkDetails('1');

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(routerSpy.navigate).toHaveBeenCalled();
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('downloadDocument', () => {
    it('debería mostrar error si no hay un documento adjunto válido', async () => {
      // Estado inicial vacío
      service.details.set(null);

      await service.downloadDocument();

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Archivo no disponible',
        type: NotificationType.ERROR
      }));
      expect(downloadSpy.download).not.toHaveBeenCalled();
    });

    it('debería iniciar la descarga correctamente y notificar éxito', async () => {
      const mockView: Partial<ThesisWorkDetailsView> = {
        mainDocument: { url: 'http://test.com/doc.pdf', name: 'doc.pdf', description: '' }
      };
      service.details.set(mockView as ThesisWorkDetailsView);

      // Simulamos que la promesa se resuelve correctamente
      (downloadSpy.download as jest.Mock).mockResolvedValue(undefined);

      await service.downloadDocument();

      // Debería notificar que inicia, intentar descargar y notificar confirmación
      expect(notificationSpy.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(downloadSpy.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'doc.pdf');
      expect(notificationSpy.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.CONFIRMATION }));
    });

    it('debería manejar errores en la descarga y notificar el fallo', async () => {
      const mockView: Partial<ThesisWorkDetailsView> = {
        mainDocument: { url: 'http://test.com/doc.pdf', name: 'doc.pdf', description: '' }
      };
      service.details.set(mockView as ThesisWorkDetailsView);

      // Simulamos un rechazo en la promesa de descarga
      (downloadSpy.download as jest.Mock).mockRejectedValue(new Error('Network error'));

      await service.downloadDocument();

      expect(notificationSpy.show).toHaveBeenNthCalledWith(1, expect.objectContaining({ type: NotificationType.INFO }));
      expect(downloadSpy.download).toHaveBeenCalled();
      // Verificamos que lance la notificación del catch
      expect(notificationSpy.show).toHaveBeenNthCalledWith(2, expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });

  describe('Navegación y Manejo de Errores (goBack / handleMissingId)', () => {
    it('goBack debería navegar al historial si la URL contiene "history"', () => {
      // Modificamos la propiedad readonly de forma segura para la prueba
      Object.defineProperty(routerSpy, 'url', { value: '/history/details', configurable: true });

      service.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('goBack debería navegar a thesis-work por defecto', () => {
      Object.defineProperty(routerSpy, 'url', { value: '/some-other-path', configurable: true });

      service.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/thesis-work']);
    });

    it('handleMissingId debería mostrar error y llamar a goBack', () => {
      const goBackSpy = jest.spyOn(service, 'goBack');

      service.handleMissingId();

      expect(notificationSpy.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Identificador faltante',
        type: NotificationType.ERROR
      }));
      expect(goBackSpy).toHaveBeenCalled();
    });
  });
});
