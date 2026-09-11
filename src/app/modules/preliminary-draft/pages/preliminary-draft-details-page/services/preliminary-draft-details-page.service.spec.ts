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

// 🔹 REFACTOR: Funciones Fábrica para generar objetos limpios y evitar mutaciones cruzadas
const createMockUser = (overrides: Partial<User> = {}): User => ({
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
  state: UserState.active,
  ...overrides
} as User);

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'anteproyecto.pdf',
  url: 'http://docs/anteproyecto.pdf',
  uploadDate: '23/07/2026',
  type: DocumentType.ANTEPROYECTO,
  ...overrides
} as FileDocument);

type ProposalData = NonNullable<PreliminaryDraft['proposalData']>;
const createMockProposalData = (overrides: Partial<ProposalData> = {}): ProposalData => ({
  id: 'prop-1',
  title: 'Title',
  description: 'Desc',
  modality: Modality.TI,
  authors: [createMockUser()],
  director: createMockUser(),
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
} as ProposalData);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  // Por defecto, se incluye un Formato C (índice 0) y un Anteproyecto (índice 1) para probar el computado
  documents: [
    createMockDocument({ id: 'doc-2', type: DocumentType.FORMATO_C, name: 'formato_c.pdf' }),
    createMockDocument()
  ],
  proposalData: createMockProposalData(),
  ...overrides
} as PreliminaryDraft);

describe('PreliminaryDraftDetailsPageService', () => {
  let service: PreliminaryDraftDetailsPageService;

  // 🔹 REFACTOR: Estructuras estrictamente tipadas para los Mocks (Sin usar 'any' ni casteos raros)
  let mockRouteParamMapGet: jest.Mock;
  let mockParentRouteParamMapGet: jest.Mock;
  let mockRouter: { navigate: jest.Mock; url: string };
  let mockPreliminaryDraftService: { getPreliminaryDraftById: jest.Mock };
  let mockUserService: { getUserFullName: jest.Mock; getAuthorsNames: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockDownloadService: { download: jest.Mock };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouteParamMapGet = jest.fn();
    mockParentRouteParamMapGet = jest.fn();

    const mockRoute = {
      snapshot: { paramMap: { get: mockRouteParamMapGet } },
      parent: { snapshot: { paramMap: { get: mockParentRouteParamMapGet } } }
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
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Método init()', () => {
    it('debería notificar error y regresar si no hay ID en la ruta', () => {
      mockRouteParamMapGet.mockReturnValue(null);
      mockParentRouteParamMapGet.mockReturnValue(null);

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Identificador faltante' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería asignar los datos a la Signal si la petición HTTP es exitosa', () => {
      mockRouteParamMapGet.mockReturnValue('draft-1');
      const draft = createMockDraft();
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(draft));

      service.init();

      expect(service.preliminaryDraftDetails()).toEqual(draft);
    });

    it('debería notificar y regresar si la petición es exitosa pero no retorna datos', () => {
      mockRouteParamMapGet.mockReturnValue('draft-no-existe');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(of(null));

      service.init();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Registro inexistente' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });

    it('debería manejar el error si la llamada al backend falla', () => {
      mockRouteParamMapGet.mockReturnValue('draft-1');
      mockPreliminaryDraftService.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Error de conexión')));

      service.init();

      expect(console.error).toHaveBeenCalled(); // Validamos que pasó por el catch que loggea
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor' })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft']);
    });
  });

  describe('Señal Computada: mainDocument()', () => {
    it('debería obtener el documento tipo "Anteproyecto" (DocumentType.ANTEPROYECTO)', () => {
      service.preliminaryDraftDetails.set(createMockDraft());

      // Aunque FORMATO_C está de primero en el mock array, debe encontrar ANTEPROYECTO
      expect(service.mainDocument()?.type).toBe(DocumentType.ANTEPROYECTO);
      expect(service.mainDocument()?.name).toBe('anteproyecto.pdf');
    });

    it('debería retornar el primer documento si no hay ninguno marcado como "Anteproyecto"', () => {
      const draftWithoutAnteproyecto = createMockDraft({
        documents: [createMockDocument({ id: 'doc-2', type: DocumentType.FORMATO_C, name: 'formato_c.pdf' })]
      });

      service.preliminaryDraftDetails.set(draftWithoutAnteproyecto);

      expect(service.mainDocument()?.type).toBe(DocumentType.FORMATO_C);
    });

    it('debería retornar null si el array de documentos está vacío', () => {
      const draftWithoutDocs = createMockDraft({ documents: [] });
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
      const authorMock = createMockUser();

      expect(service.getAuthors([authorMock])).toBe('Autor Mock');
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith([authorMock]);
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
      expect(mockRouter.navigate).toHaveBeenCalledWith(['evaluations_performed'], { relativeTo: expect.anything() });
    });

    it('navigateToDocuments() debería navegar relativo a la ruta actual', () => {
      service.navigateToDocuments();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: expect.anything() });
    });
  });

  describe('Descarga de Documento (downloadDocument) - Flujo Asíncrono', () => {
    it('debería notificar y descargar correctamente si existe el documento principal', async () => {
      service.preliminaryDraftDetails.set(createMockDraft());
      mockDownloadService.download.mockResolvedValue(undefined); // Mockeamos la promesa resuelta

      await service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Iniciando transferencia', type: NotificationType.INFO })
      );
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://docs/anteproyecto.pdf', 'anteproyecto.pdf');
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Descarga exitosa', type: NotificationType.CONFIRMATION })
      );
    });

    it('debería notificar error si el documento principal no existe (o no tiene URL)', async () => {
      const draftInvalidDoc = createMockDraft({ documents: [] });
      service.preliminaryDraftDetails.set(draftInvalidDoc);

      await service.downloadDocument();

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo no disponible', type: NotificationType.ERROR })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería notificar error si la Promesa de FileDownloadService es rechazada', async () => {
      service.preliminaryDraftDetails.set(createMockDraft());
      mockDownloadService.download.mockRejectedValue(new Error('Fallo de red')); // Promesa falla

      await service.downloadDocument();

      expect(console.error).toHaveBeenCalled(); // Validamos que pasó por el console.error
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Archivo no disponible', type: NotificationType.ERROR }) // catch block
      );
    });
  });
});
