import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { PreliminaryDraftDetailsPageService } from './preliminary-draft-details-page.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('PreliminaryDraftDetailsPageService', () => {
  let service: PreliminaryDraftDetailsPageService;

  // Estructuras estrictas para reemplazar los 'any'
  let mockRoute: { snapshot: { paramMap: { get: jest.Mock } }; parent: { snapshot: { paramMap: { get: jest.Mock } } } };
  let mockRouter: { navigate: jest.Mock; url: string };
  let mockPreliminaryDraftService: { getPreliminaryDraftById: jest.Mock };
  let mockUserService: { getUserFullName: jest.Mock; getAuthorsNames: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockDownloadService: { download: jest.Mock };

  beforeEach(() => {
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn() } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };

    mockRouter = {
      navigate: jest.fn(),
      url: '/preliminary-draft'
    };

    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn()
    };

    mockUserService = {
      getUserFullName: jest.fn(),
      getAuthorsNames: jest.fn()
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockDownloadService = {
      download: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftDetailsPageService,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FileDownloadService, useValue: mockDownloadService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftDetailsPageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('init()', () => {
    it('debería notificar error y regresar si no hay ID en la ruta', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue(null);
      mockRoute.parent.snapshot.paramMap.get.mockReturnValue(null);

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR, title: 'Identificador faltante' }));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería asignar los datos si la petición es exitosa', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      const mockDraft = { preliminaryDraftId: '123', documents: [] } as unknown as PreliminaryDraft;
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      service.init();

      expect(service.preliminaryDraftDetails()).toEqual(mockDraft);
    });

    it('debería notificar y regresar si la petición es exitosa pero no retorna datos', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(null));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Registro inexistente' }));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar error del servicio de datos', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('123');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Error')));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de servidor' }));
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });
  });

  describe('Señal Computada: mainDocument()', () => {
    it('debería obtener el documento tipo "Anteproyecto"', () => {
      const mockDraft = {
        documents: [{ type: 'Otro' }, { type: 'Anteproyecto', url: 'http://test.com' }]
      } as unknown as PreliminaryDraft;

      service.preliminaryDraftDetails.set(mockDraft);

      expect(service.mainDocument()?.type).toBe('Anteproyecto');
    });
  });

  describe('Acciones secundarias', () => {
    it('goBack() debería redirigir a history si la ruta actual lo contiene', () => {
      mockRouter.url = '/history/details/123';
      service.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('downloadDocument() debería notificar y descargar si existe el documento', () => {
      const mockDraft = {
        documents: [{ type: 'Anteproyecto', url: 'http://test.com', name: 'Doc.pdf' }]
      } as unknown as PreliminaryDraft;
      service.preliminaryDraftDetails.set(mockDraft);

      service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Iniciando transferencia' }));
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test.com', 'Doc.pdf');
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Descarga exitosa' }));
    });

    it('downloadDocument() debería notificar error si no existe URL', () => {
      const mockDraft = { documents: [] } as unknown as PreliminaryDraft;
      service.preliminaryDraftDetails.set(mockDraft);

      service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Archivo no disponible' }));
    });

    it('navigateToEvaluations() debería navegar relativo a la ruta actual', () => {
      service.navigateToEvaluations();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['evaluations_performed'], { relativeTo: mockRoute });
    });

    it('navigateToDocuments() debería navegar relativo a la ruta actual', () => {
      service.navigateToDocuments();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: mockRoute });
    });
  });
});
