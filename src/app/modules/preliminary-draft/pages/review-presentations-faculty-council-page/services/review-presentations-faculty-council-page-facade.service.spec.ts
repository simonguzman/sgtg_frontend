// 1. Angular Core & Testing
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';

// 2. RxJS
import { of, throwError } from 'rxjs';

// 3. Core Enums, Interfaces & Utils
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

// 4. Shared Modules & Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { UserService } from '../../../../users/services/user.service';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';

// 5. Component, Service & Models
import { SaveEvaluationPayload } from '../../../components/review-presentations-faculty-council-form/models/council-evaluation.model';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { ReviewPresentationsFacultyCouncilPageFacadeService } from './review-presentations-faculty-council-page-facade.service';

// Hacemos mock de la utilidad de lectura de archivos para que Jest no intente leer un Blob real
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn().mockResolvedValue('data:application/pdf;base64,mockFileContent')
}));

describe('ReviewPresentationsFacultyCouncilPageFacadeService', () => {
  let facade: ReviewPresentationsFacultyCouncilPageFacadeService;
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockNotification: jest.Mocked<Partial<NotificationService>>;
  let mockDownloadService: jest.Mocked<Partial<FileDownloadService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;

  // Mocks Tipados Estrictamente (Sin 'any' ni 'as unknown')
  const mockUser: User = {
    id: 'user-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Usuario',
    lastName: 'Mock',
    secondLastName: 'Test',
    codeNumber: 12345,
    roles: [],
    email: 'mock@test.com',
    password: 'hash',
    state: UserState.active
  };

  const mockFileDocument: FileDocument = {
    id: 'doc-1',
    name: 'anteproyecto.pdf',
    url: 'http://docs/anteproyecto.pdf',
    uploadDate: '23/07/2026',
    type: DocumentType.ANTEPROYECTO
  };

  const mockFormatoCDocument: FileDocument = {
    id: 'doc-2',
    name: 'formato_c.pdf',
    url: 'http://docs/formato_c.pdf',
    uploadDate: '22/07/2026',
    type: DocumentType.FORMATO_C
  };

  const mockDraft: PreliminaryDraft = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.EN_REVISION,
    createdData: new Date('2026-08-12'),
    evaluations: [
      {
        id: 'eval-1',
        documentId: 'doc-1', // Vincula a la iteración activa
        proposalId: 'prop-1',
        evaluatorId: 'user-1',
        evaluatorName: 'Usuario Mock',
        evaluatorRole: 'Evaluador',
        veredict: stateList.APROBADO,
        observations: 'Ok',
        date: new Date(),
        signedDocuments: [{ name: 'resolucion.pdf', url: 'http://docs/resolucion.pdf' }]
      }
    ],
    documents: [mockFileDocument, mockFormatoCDocument],
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

  const mockRouteValue = {
    snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-1') } },
    parent: { parent: { snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } } } }
  };

  beforeEach(() => {
    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn().mockReturnValue(of(mockDraft)),
      uploadCouncilResolution: jest.fn().mockReturnValue(of({}))
    };

    mockAuthService = {
      currentUser: signal<User | null>(mockUser)
    };

    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Usuario Mock')
    };

    mockNotification = { show: jest.fn() };
    mockDownloadService = { download: jest.fn() };
    mockRouter = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        ReviewPresentationsFacultyCouncilPageFacadeService,
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotification },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRouteValue }
      ]
    });

    facade = TestBed.inject(ReviewPresentationsFacultyCouncilPageFacadeService);
    jest.clearAllMocks(); // Limpia el historial del FileReader mockeado entre tests
  });

  describe('Carga de Datos (loadData)', () => {
    it('debería cargar el anteproyecto exitosamente si existe el ID', () => {
      facade.loadData();
      expect(mockPreliminaryDraftService.getPreliminaryDraftById).toHaveBeenCalledWith('draft-1');
      expect(facade.preliminaryDraftState()).toEqual(mockDraft);
    });

    it('debería mostrar notificación INFO si la petición es exitosa pero no retorna datos', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(of(null));
      facade.loadData();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO })
      );
    });

    it('debería mostrar notificación ERROR si falla la petición HTTP', () => {
      (mockPreliminaryDraftService.getPreliminaryDraftById as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));
      facade.loadData();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });

  describe('Propiedad Computada: filteredPreliminaryDraft', () => {
    it('debería retornar null si no hay draft cargado', () => {
      expect(facade.filteredPreliminaryDraft()).toBeNull();
    });

    it('debería filtrar los documentos y agregar evaluaciones de la iteración actual', () => {
      facade.preliminaryDraftState.set(mockDraft);
      const result = facade.filteredPreliminaryDraft();

      expect(result).toBeTruthy();
      expect(result?.documents.length).toBe(2);
      expect(result?.evaluations.length).toBe(1);
    });
  });

  describe('Flujo de Confirmación y Decisión', () => {
    const mockPayload: SaveEvaluationPayload = {
      formValues: { result: stateList.APROBADO, comments: 'Excelente', maximumDeliveryDate: null, document: null },
      file: new File([''], 'resolucion.pdf', { type: 'application/pdf' })
    };

    it('debería setear datos pendientes y abrir modal (handleRequestConfirmation)', () => {
      facade.handleRequestConfirmation(mockPayload);

      expect(facade.pendingData()).toEqual(mockPayload);
      expect(facade.isConfirmModalOpen()).toBe(true);
    });

    it('debería mostrar error de validación si faltan datos en processCouncilDecision', async () => {
      facade.pendingData.set(null);

      await facade.processCouncilDecision();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de validación' })
      );
    });

    it('debería mostrar notificación de error si falla la lectura del archivo', async () => {
      (readFileAsDataUrl as jest.Mock).mockRejectedValueOnce(new Error('Read failed'));
      facade.preliminaryDraftState.set(mockDraft);
      facade.pendingData.set(mockPayload);

      await facade.processCouncilDecision();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error al leer el archivo' })
      );
    });

    it('debería procesar decisión exitosamente y redirigir', async () => {
      facade.preliminaryDraftState.set(mockDraft);
      facade.pendingData.set(mockPayload);

      // Importante: Await porque el método ahora es async
      await facade.processCouncilDecision();

      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockPayload.file);
      expect(mockPreliminaryDraftService.uploadCouncilResolution).toHaveBeenCalled();
      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
      expect(facade.isConfirmModalOpen()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRouteValue });
    });

    it('debería mostrar error si falla la subida de la resolución HTTP', async () => {
      (mockPreliminaryDraftService.uploadCouncilResolution as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));
      facade.preliminaryDraftState.set(mockDraft);
      facade.pendingData.set(mockPayload);

      await facade.processCouncilDecision();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error al guardar' })
      );
    });
  });

  describe('Descarga y Navegación', () => {
    it('debería descargar el archivo si tiene URL válida', () => {
      const docToDownload: FormattedDocument = { url: 'http://test.com/doc.pdf', name: 'doc.pdf' };

      facade.downloadFile(docToDownload);

      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'doc.pdf');
    });

    it('debería mostrar notificación de INFO si el documento no tiene URL', () => {
      const invalidDoc: FormattedDocument = { url: '', name: 'doc.pdf' };

      facade.downloadFile(invalidDoc);

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Descarga no disponible' })
      );
    });

    it('debería navegar hacia atrás (goBack)', () => {
      facade.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRouteValue });
    });
  });
});
