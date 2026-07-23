import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ReviewPreliminaryDraftPageFacadeService, PendingReviewData } from './review-preliminary-draft-page-facade.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';

describe('ReviewPreliminaryDraftPageFacadeService', () => {
  let service: ReviewPreliminaryDraftPageFacadeService;

  // Mocks tipados sin usar 'any'
  let preliminaryDraftServiceMock: {
    getPreliminaryDraftById: jest.Mock;
    addEvaluation: jest.Mock;
  };
  let authServiceMock: { currentUser: jest.Mock };
  let notificationServiceMock: { show: jest.Mock };
  let downloadServiceMock: { download: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  const mockUser = { id: 'u1', firstName: 'Juan', lastName: 'Perez' };

  // Cast a Partial<PreliminaryDraft> para evitar errores de tipado por propiedades faltantes
  const mockDraft = {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    evaluators: [{ id: 'u1' }],
    documents: [
      { id: 'doc-1', type: 'Anteproyecto', uploadDate: '2026-07-20T10:00:00Z', url: 'url1', name: 'doc1.pdf' }
    ]
  } as unknown as PreliminaryDraft;

  beforeEach(() => {
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mock-uuid-1234') }
    });

    preliminaryDraftServiceMock = {
      getPreliminaryDraftById: jest.fn(),
      addEvaluation: jest.fn()
    };

    authServiceMock = {
      currentUser: jest.fn().mockReturnValue(mockUser)
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    downloadServiceMock = {
      download: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    const routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-1') } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };

    TestBed.configureTestingModule({
      providers: [
        ReviewPreliminaryDraftPageFacadeService,
        { provide: PreliminaryDraftService, useValue: preliminaryDraftServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    });

    service = TestBed.inject(ReviewPreliminaryDraftPageFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('init() y loadData()', () => {
    it('debería cargar los datos si el usuario es evaluador', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      service.init();

      expect(preliminaryDraftServiceMock.getPreliminaryDraftById).toHaveBeenCalledWith('draft-1');
      expect(service.preliminaryDraftState()).toEqual(mockDraft);
    });

    it('debería denegar el acceso y redirigir si el usuario no es evaluador', () => {
      authServiceMock.currentUser.mockReturnValue({ id: 'u2' });
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(mockDraft));

      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Acceso Denegado'
      }));
      expect(routerMock.navigate).toHaveBeenCalledWith(['/dashboard']);
    });

    it('debería notificar error si no encuentra el anteproyecto', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(null));

      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO,
        title: 'No encontrado'
      }));
    });

    it('debería notificar error de conexión si falla la API', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Net Error')));

      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de conexión'
      }));
    });
  });

  describe('handleRequestConfirmation()', () => {
    it('debería actualizar el estado y abrir el modal', () => {
      const mockData: PendingReviewData = {
        formValues: { result: stateList.APROBADO, comments: 'Ok' },
        file: new File([], 'test.pdf')
      };

      service.handleRequestConfirmation(mockData);

      expect(service.pendingReviewData()).toEqual(mockData);
      expect(service.isConfirmModalOpen()).toBe(true);
    });
  });

  describe('processEvaluation()', () => {
    it('debería detenerse y notificar si faltan datos', () => {
      service.pendingReviewData.set(null);
      service.processEvaluation();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Datos incompletos'
      }));
      expect(preliminaryDraftServiceMock.addEvaluation).not.toHaveBeenCalled();
    });

    it('debería procesar la evaluación correctamente (Aprobado) y navegar', () => {
      service.preliminaryDraftState.set(mockDraft);
      service.pendingReviewData.set({
        formValues: { result: stateList.APROBADO, comments: 'Todo bien' },
        file: new File([], 'evaluacion.pdf')
      });
      preliminaryDraftServiceMock.addEvaluation.mockReturnValue(of(undefined));

      service.processEvaluation();

      expect(preliminaryDraftServiceMock.addEvaluation).toHaveBeenCalledWith(
        'draft-1',
        expect.objectContaining({
          veredict: stateList.APROBADO,
          observations: 'Todo bien',
          signedDocuments: ['evaluacion.pdf']
        })
      );
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION,
        title: 'Evaluación Registrada'
      }));
      expect(service.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['../../'], expect.any(Object));
    });
  });

  describe('downloadCurrentDocument()', () => {
    it('debería descargar el documento si hay una revisión activa', () => {
      service.preliminaryDraftState.set(mockDraft);

      service.downloadCurrentDocument();

      expect(downloadServiceMock.download).toHaveBeenCalledWith('url1', 'doc1.pdf');
    });

    it('debería mostrar error si no hay revisión activa', () => {
      service.preliminaryDraftState.set({ documents: [] } as unknown as PreliminaryDraft);

      service.downloadCurrentDocument();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO,
        title: 'Error de descarga'
      }));
    });
  });
});
