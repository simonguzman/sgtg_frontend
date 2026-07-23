import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ReviewPresentationsFacultyCouncilPageFacadeService } from './review-presentations-faculty-council-page-facade.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';

import { stateList } from '../../../../../core/enums/state.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { SaveEvaluationPayload } from '../../../components/review-presentations-faculty-council-form/models/council-evaluation.model';

describe('ReviewPresentationsFacultyCouncilPageFacadeService', () => {
  let facade: ReviewPresentationsFacultyCouncilPageFacadeService;
  let mockPreliminaryDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockNotification: jest.Mocked<Partial<NotificationService>>;
  let mockDownloadService: jest.Mocked<Partial<FileDownloadService>>;
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockRoute: any;

  const mockDraft = {
    id: 'draft-1',
    preliminaryDraftId: 'proposal-1',
    documents: [
      { id: 'doc-1', type: 'Anteproyecto', uploadDate: '2026-07-23' },
      { id: 'doc-2', type: DocumentType.FORMATO_C, uploadDate: '2026-07-22' }
    ],
    evaluations: [
      { documentId: 'doc-1', signedDocuments: ['resolucion.pdf'] }
    ]
  } as unknown as PreliminaryDraft;

  beforeEach(() => {
    mockPreliminaryDraftService = {
      getPreliminaryDraftById: jest.fn().mockReturnValue(of(mockDraft)),
      uploadCouncilResolution: jest.fn().mockReturnValue(of({}))
    };

    mockAuthService = {
      currentUser: signal({ id: 'user-1' } as any)
    };

    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Usuario Mock')
    };

    mockNotification = { show: jest.fn() };
    mockDownloadService = { download: jest.fn() };
    mockRouter = { navigate: jest.fn() };

    mockRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-1') } },
      parent: { parent: { snapshot: { paramMap: { get: jest.fn() } } } }
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewPresentationsFacultyCouncilPageFacadeService,
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: NotificationService, useValue: mockNotification },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute }
      ]
    });

    facade = TestBed.inject(ReviewPresentationsFacultyCouncilPageFacadeService);
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
      expect(result?.documents.length).toBe(2); // Anteproyecto base y FORMATO_C (referencia permanente)
      expect(result?.evaluations.length).toBe(1);
    });
  });

  describe('Flujo de Confirmación y Decisión', () => {
    const mockPayload: SaveEvaluationPayload = {
      formValues: { result: 'Aprobado', comments: 'Excelente', maximumDeliveryDate: null, document: null },
      file: new File([''], 'resolucion.pdf')
    };

    it('debería setear datos pendientes y abrir modal (handleRequestConfirmation)', () => {
      facade.handleRequestConfirmation(mockPayload);

      expect(facade.pendingData()).toEqual(mockPayload);
      expect(facade.isConfirmModalOpen()).toBe(true);
    });

    it('debería mostrar error de validación si faltan datos en processCouncilDecision', () => {
      facade.pendingData.set(null); // Sin datos pendientes
      facade.processCouncilDecision();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error de validación' })
      );
    });

    it('debería procesar decisión exitosamente y redirigir', () => {
      facade.preliminaryDraftState.set(mockDraft);
      facade.pendingData.set(mockPayload);

      facade.processCouncilDecision();

      expect(mockPreliminaryDraftService.uploadCouncilResolution).toHaveBeenCalled();
      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.CONFIRMATION })
      );
      expect(facade.isConfirmModalOpen()).toBe(false);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRoute });
    });

    it('debería mostrar error si falla la subida de la resolución', () => {
      (mockPreliminaryDraftService.uploadCouncilResolution as jest.Mock).mockReturnValue(throwError(() => new Error('Error')));
      facade.preliminaryDraftState.set(mockDraft);
      facade.pendingData.set(mockPayload);

      facade.processCouncilDecision();

      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Error al guardar' })
      );
    });
  });

  describe('Descarga y Navegación', () => {
    it('debería descargar el archivo si tiene URL válida', () => {
      facade.downloadFile({ url: 'http://test.com/doc.pdf', name: 'doc.pdf' } as any);
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'doc.pdf');
    });

    it('debería mostrar notificación de INFO si el documento no tiene URL', () => {
      facade.downloadFile({ url: '', name: 'doc.pdf' } as any);
      expect(mockNotification.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.INFO, title: 'Descarga no disponible' })
      );
    });

    it('debería navegar hacia atrás (goBack)', () => {
      facade.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRoute });
    });
  });
});
