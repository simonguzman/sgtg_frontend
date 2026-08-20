// 1. Angular Core & Testing
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

// 2. RxJS
import { of, throwError } from 'rxjs';

// 3. Core Enums & Interfaces
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';

// 4. Shared Modules & Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { UserService } from '../../../../users/services/user.service';
import { Modality } from '../../../../proposal/enums/modality.enum';

// 5. Service & Models
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { PreliminaryDraftDetailsPageService } from './preliminary-draft-details-page.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';

describe('PreliminaryDraftDetailsPageService', () => {
  let service: PreliminaryDraftDetailsPageService;

  // Estructuras estrictamente tipadas para los Mocks (Sin usar 'any')
  let mockRoute: {
    snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
    parent: { snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } } };
  };
  let mockRouter: { navigate: jest.Mock; url: string };
  let mockPreliminaryDraftService: { getPreliminaryDraftById: jest.Mock };
  let mockUserService: { getUserFullName: jest.Mock; getAuthorsNames: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockDownloadService: { download: jest.Mock };

  // Objetos Mock Completos para respetar las interfaces estrictas
  const mockUser: User = {
    id: 'user-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Usuario',
    lastName: 'Test',
    secondLastName: 'Mock',
    codeNumber: 1111,
    roles: [],
    email: 'user@test.com',
    password: 'hash',
    state: UserState.active
  };

  const mockAnteproyectoDoc: FileDocument = {
    id: 'doc-1',
    name: 'anteproyecto.pdf',
    url: 'http://docs/anteproyecto.pdf',
    uploadDate: '23/07/2026',
    type: DocumentType.ANTEPROYECTO
  };

  const mockFormatoCDoc: FileDocument = {
    id: 'doc-2',
    name: 'formato_c.pdf',
    url: 'http://docs/formato_c.pdf',
    uploadDate: '23/07/2026',
    type: DocumentType.FORMATO_C
  };

  const mockDraft: PreliminaryDraft = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.EN_REVISION,
    createdData: new Date(),
    evaluations: [],
    documents: [mockFormatoCDoc, mockAnteproyectoDoc], // En desorden a propósito para probar el computado
    proposalData: {
      id: 'prop-1',
      title: 'Title',
      description: 'Desc',
      modality: Modality.TI,
      authors: [mockUser],
      director: mockUser,
      state: stateList.EN_REVISION,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    }
  };

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

  describe('Método init()', () => {
    it('debería notificar error y regresar si no hay ID en la ruta', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue(null);
      mockRoute.parent.snapshot.paramMap.get.mockReturnValue(null);

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Identificador faltante' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería asignar los datos a la Signal si la petición HTTP es exitosa', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('draft-1');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      service.init();

      expect(service.preliminaryDraftDetails()).toEqual(mockDraft);
    });

    it('debería notificar y regresar si la petición es exitosa pero no retorna datos', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('draft-no-existe');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(null));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Registro inexistente' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar el error si la llamada al backend falla', () => {
      mockRoute.snapshot.paramMap.get.mockReturnValue('draft-1');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Error de conexión')));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);

      consoleSpy.mockRestore();
    });
  });

  describe('Señal Computada: mainDocument()', () => {
    it('debería obtener el documento tipo "Anteproyecto" (DocumentType.ANTEPROYECTO)', () => {
      service.preliminaryDraftDetails.set(mockDraft);

      // Aunque FORMATO_C está de primero en el mock array, debe encontrar ANTEPROYECTO
      expect(service.mainDocument()?.type).toBe(DocumentType.ANTEPROYECTO);
      expect(service.mainDocument()?.name).toBe('anteproyecto.pdf');
    });

    it('debería retornar el primer documento si no hay ninguno marcado como "Anteproyecto"', () => {
      const draftWithoutAnteproyecto = {
        ...mockDraft,
        documents: [mockFormatoCDoc] // Solo dejamos Formato C
      };

      service.preliminaryDraftDetails.set(draftWithoutAnteproyecto);

      expect(service.mainDocument()?.type).toBe(DocumentType.FORMATO_C);
    });

    it('debería retornar null si el array de documentos está vacío', () => {
      const draftWithoutDocs = { ...mockDraft, documents: [] };
      service.preliminaryDraftDetails.set(draftWithoutDocs);

      expect(service.mainDocument()).toBeNull();
    });
  });

  describe('Delegación al UserService', () => {
    it('getMemberName() debería delegar la responsabilidad', () => {
      mockUserService.getUserFullName.mockReturnValue('Nombre Completo Mock');

      expect(service.getMemberName('user-1')).toBe('Nombre Completo Mock');
      expect(mockUserService.getUserFullName).toHaveBeenCalledWith('user-1');
    });

    it('getAuthors() debería delegar la responsabilidad', () => {
      mockUserService.getAuthorsNames.mockReturnValue('Autor Mock');

      expect(service.getAuthors([mockUser])).toBe('Autor Mock');
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith([mockUser]);
    });
  });

  describe('Flujos de Acción Secundaria', () => {
    it('goBack() debería redirigir a history si la ruta actual lo contiene', () => {
      mockRouter.url = '/history/details/draft-1';
      service.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
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

  describe('Descarga de Documento (downloadDocument) - Flujo Asíncrono', () => {
    it('debería notificar y descargar correctamente si existe el documento principal', async () => {
      service.preliminaryDraftDetails.set(mockDraft);
      mockDownloadService.download.mockResolvedValue(undefined); // Mockeamos la promesa resuelta

      await service.downloadDocument(); // IMPORTANTE: Ahora esperamos que la promesa termine

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Iniciando transferencia', type: NotificationType.INFO })
      );
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://docs/anteproyecto.pdf', 'anteproyecto.pdf');
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Descarga exitosa', type: NotificationType.CONFIRMATION })
      );
    });

    it('debería notificar error si el documento principal no existe (o no tiene URL)', async () => {
      const draftInvalidDoc = { ...mockDraft, documents: [] };
      service.preliminaryDraftDetails.set(draftInvalidDoc);

      await service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo no disponible', type: NotificationType.ERROR })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería notificar error si la Promesa de FileDownloadService es rechazada', async () => {
      service.preliminaryDraftDetails.set(mockDraft);
      mockDownloadService.download.mockRejectedValue(new Error('Fallo de red')); // Promesa falla

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo no disponible', type: NotificationType.ERROR }) // catch block
      );

      consoleSpy.mockRestore();
    });
  });
});
