import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError, Observable } from 'rxjs';
import { ThesisWorkDetailsFacadeService } from './thesis-work-details-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisWorkDetailsMapperService } from './thesis-work-details-mapper.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';
import { stateList } from '../../../../../core/enums/state.enum';

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [any[]]>;
  url: string;
}

interface MockThesisWorkService {
  getThesisWorkById: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
}

interface MockThesisWorkDetailsMapperService {
  mapToView: jest.Mock<ThesisWorkDetailsView, [ThesisWork]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'tw-1',
  preliminaryDraftId: 'draft-1',
  documents: [],
  evaluations: [],
  specialRequests: [],
  state: stateList.EN_DESARROLLO,
  createdDate: new Date(),
  preliminaryDraftData: {} as any,
  ...overrides
} as ThesisWork);

const createMockThesisWorkDetailsView = (overrides: Partial<ThesisWorkDetailsView> = {}): ThesisWorkDetailsView => ({
  heading: 'Información del trabajo de grado',
  title: 'Título de Prueba',
  specificObjectives: [],
  modality: 'Trabajo de investigación',
  state: 'En Desarrollo',
  participants: [{ label: 'Estudiante', value: 'Estudiante 1' }, { label: 'Director', value: 'Director 1' }],
  dates: [],
  documents: [{ name: 'documento_final.pdf', url: 'https://storage.com/documento_final.pdf',
    description: 'Resolución del Consejo' }],
  ...overrides
});

describe('ThesisWorkDetailsFacadeService', () => {
  let service: ThesisWorkDetailsFacadeService;

  let routerMock: MockRouter;
  let thesisServiceMock: MockThesisWorkService;
  let mapperMock: MockThesisWorkDetailsMapperService;
  let downloadMock: MockFileDownloadService;
  let notificationMock: MockNotificationService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true),
      url: '/thesis-work/details'
    };

    thesisServiceMock = {
      getThesisWorkById: jest.fn()
    };

    mapperMock = {
      mapToView: jest.fn()
    };

    downloadMock = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    notificationMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkDetailsFacadeService,
        { provide: Router, useValue: routerMock },
        { provide: ThesisWorkService, useValue: thesisServiceMock },
        { provide: ThesisWorkDetailsMapperService, useValue: mapperMock },
        { provide: FileDownloadService, useValue: downloadMock },
        { provide: NotificationService, useValue: notificationMock }
      ]
    });

    service = TestBed.inject(ThesisWorkDetailsFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('loadThesisWorkDetails', () => {
    it('debería cargar los detalles y mapearlos exitosamente', () => {
      const mockData = createMockThesisWork({ thesisWorkId: '1' });
      const mockView = createMockThesisWorkDetailsView({ id: '1', title: 'Test Title' });

      thesisServiceMock.getThesisWorkById.mockReturnValue(of(mockData));
      mapperMock.mapToView.mockReturnValue(mockView);

      service.loadThesisWorkDetails('1');

      expect(service.isLoading()).toBe(false);
      expect(service.details()).toEqual(mockView);
      expect(mapperMock.mapToView).toHaveBeenCalledWith(mockData);
      expect(notificationMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y regresar (goBack) si no encuentra el registro', () => {
      thesisServiceMock.getThesisWorkById.mockReturnValue(of(null));

      service.loadThesisWorkDetails('invalid-id');

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Registro inexistente',
        message: 'El trabajo de grado solicitado no se encuentra registrado en el sistema.',
        type: NotificationType.ERROR
      });
      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work']);
      expect(service.isLoading()).toBe(false);
    });

    it('debería manejar errores de la API, notificar y regresar', () => {
      const mockError = new Error('API Error');
      thesisServiceMock.getThesisWorkById.mockReturnValue(throwError(() => mockError));

      service.loadThesisWorkDetails('1');

      expect(console.error).toHaveBeenCalledWith('Error al recuperar detalles:', mockError);
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Error de comunicación',
        message: 'Hubo un problema al conectar con el repositorio.',
        type: NotificationType.ERROR
      });
      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work']);
      expect(service.isLoading()).toBe(false);
    });
  });

  describe('downloadDocument', () => {
    const documento = { url: 'http://test.com/doc.pdf', name: 'doc.pdf', description: '' };

    it('debería mostrar error si el documento no tiene URL', async () => {
      await service.downloadDocument({ ...documento, url: '' });

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Archivo no disponible',
        message: 'No se encontró el documento solicitado.',
        type: NotificationType.ERROR
      });
      expect(downloadMock.download).not.toHaveBeenCalled();
    });

    it('debería iniciar la descarga correctamente y notificar éxito', async () => {
      await service.downloadDocument(documento);

      expect(notificationMock.show).toHaveBeenNthCalledWith(1, {
        title: 'Iniciando transferencia',
        message: 'Localizando y preparando el documento para su descarga...',
        type: NotificationType.INFO
      });
      expect(downloadMock.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'doc.pdf');
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Descarga exitosa',
        message: 'El documento se ha guardado en su equipo.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debería manejar errores en la descarga y notificar el fallo', async () => {
      const mockError = new Error('Network error');
      downloadMock.download.mockRejectedValue(mockError);

      await service.downloadDocument(documento);

      expect(console.error).toHaveBeenCalledWith('Error al descargar el documento:', mockError);
      expect(notificationMock.show).toHaveBeenNthCalledWith(2, {
        title: 'Error de descarga',
        message: 'No se pudo descargar el documento. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Navegación y Manejo de Errores (goBack / handleMissingId)', () => {
    it('goBack debería navegar al historial si la URL contiene "history"', () => {
      routerMock.url = '/history/details';

      service.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('goBack debería navegar a thesis-work por defecto', () => {
      routerMock.url = '/some-other-path';

      service.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work']);
    });

    it('handleMissingId debería mostrar error y llamar a goBack', () => {
      const goBackSpy = jest.spyOn(service, 'goBack');

      service.handleMissingId();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Identificador faltante',
        message: 'No se pudo procesar la solicitud debido a un ID inválido.',
        type: NotificationType.ERROR
      });
      expect(goBackSpy).toHaveBeenCalled();
    });
  });
});
