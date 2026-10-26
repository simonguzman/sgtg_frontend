import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ReviewPreliminaryDraftPageFacadeService, PendingReviewData } from './review-preliminary-draft-page-facade.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';

describe('ReviewPreliminaryDraftPageFacadeService', () => {
  let service: ReviewPreliminaryDraftPageFacadeService;

  let preliminaryDraftServiceMock: {
    getPreliminaryDraftById: jest.Mock;
    registerEvaluatorConcept: jest.Mock;
  };
  let authServiceMock: { currentUser: jest.Mock };
  let notificationServiceMock: { show: jest.Mock };
  let downloadServiceMock: { download: jest.Mock };
  let routerMock: { navigate: jest.Mock };

  let routeParamMapGetMock: jest.Mock;
  let parentRouteParamMapGetMock: jest.Mock;

  const createMockUser = (overrides: Partial<User> = {}): User => ({
    id: 'u1',
    firstName: 'Juan',
    lastName: 'Perez',
    ...overrides
  } as User);

  const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
    id: 'doc-1',
    type: DocumentType.ANTEPROYECTO,
    uploadDate: '2026-07-20T10:00:00Z',
    url: 'url1',
    name: 'doc1.pdf',
    ...overrides
  } as FileDocument);

  const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    evaluators: [createMockUser()],
    documents: [createMockFileDocument()],
    ...overrides
  } as PreliminaryDraft);

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mock-uuid-1234') },
      writable: true
    });

    preliminaryDraftServiceMock = {
      getPreliminaryDraftById: jest.fn(),
      registerEvaluatorConcept: jest.fn()
    };

    authServiceMock = {
      currentUser: jest.fn().mockReturnValue(createMockUser())
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    downloadServiceMock = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    routerMock = {
      navigate: jest.fn()
    };

    routeParamMapGetMock = jest.fn().mockReturnValue('draft-1');
    parentRouteParamMapGetMock = jest.fn().mockReturnValue(null);

    const routeMock = {
      snapshot: { paramMap: { get: routeParamMapGetMock } },
      parent: { snapshot: { paramMap: { get: parentRouteParamMapGetMock } } }
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
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('init() y loadData()', () => {
    it('debería cargar los datos si el usuario es evaluador', () => {
      const draft = createMockDraft();
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(draft));
      service.init();

      expect(preliminaryDraftServiceMock.getPreliminaryDraftById).toHaveBeenCalledWith('draft-1');
      expect(service.preliminaryDraftState()).toEqual(draft);
    });

    it('debería mostrar error de navegación si no se encuentra el ID en la ruta', () => {
      routeParamMapGetMock.mockReturnValue(null);
      parentRouteParamMapGetMock.mockReturnValue(null);

      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de navegación'
      }));
    });

    it('debería denegar el acceso y redirigir si el usuario no es evaluador', () => {
      authServiceMock.currentUser.mockReturnValue(createMockUser({ id: 'u2' }));
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(createMockDraft()));

      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Acceso Denegado'
      }));
      // Sin página anterior vuelve a los documentos cargados (antes iba a /dashboard, que no existe)
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], expect.objectContaining({ relativeTo: expect.anything() }));
    });

    it('debería notificar error si no encuentra el anteproyecto (API retorna null/undefined)', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(of(null));
      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO,
        title: 'No encontrado'
      }));
    });

    it('debería notificar error de conexión si falla la petición HTTP', () => {
      preliminaryDraftServiceMock.getPreliminaryDraftById.mockReturnValue(throwError(() => new Error('Network Error')));
      service.init();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de conexión'
      }));
    });
  });

  describe('handleRequestConfirmation()', () => {
    it('debería actualizar el estado de pendingReviewData y abrir el modal', () => {
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
    const mockFile = new File([''], 'evaluacion.pdf', { type: 'application/pdf' });
    const mockAnnotatedFile = new File([''], 'anotaciones.pdf', { type: 'application/pdf' });

    it('debería detenerse y notificar si faltan datos en el estado', async () => {
      service.pendingReviewData.set(null);
      await service.processEvaluation();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Datos incompletos'
      }));
      expect(preliminaryDraftServiceMock.registerEvaluatorConcept).not.toHaveBeenCalled();
    });

    it('debería registrar el concepto APROBADO con el formato B y navegar', async () => {
      service.preliminaryDraftState.set(createMockDraft());
      service.pendingReviewData.set({
        formValues: { result: stateList.APROBADO, comments: 'Aprobado sin problemas' },
        file: mockFile
      });
      preliminaryDraftServiceMock.registerEvaluatorConcept.mockReturnValue(of(createMockDraft()));

      await service.processEvaluation();

      expect(preliminaryDraftServiceMock.registerEvaluatorConcept)
        .toHaveBeenCalledWith('draft-1', 'APROBADO', 'Aprobado sin problemas', mockFile, null);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION,
        title: 'Evaluación Registrada',
        message: 'El veredicto positivo ha sido guardado exitosamente.'
      }));
      expect(service.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], expect.any(Object));
    });

    it('si pide correcciones envía CON_CORRECCIONES con el formato B y las anotaciones', async () => {
      service.preliminaryDraftState.set(createMockDraft());
      service.pendingReviewData.set({
        formValues: { result: stateList.APROBADO_CON_OBSERVACIONES, comments: 'Requiere ajustes' },
        file: mockFile,
        annotatedFile: mockAnnotatedFile
      });
      preliminaryDraftServiceMock.registerEvaluatorConcept.mockReturnValue(of(createMockDraft()));

      await service.processEvaluation();

      expect(preliminaryDraftServiceMock.registerEvaluatorConcept)
        .toHaveBeenCalledWith('draft-1', 'CON_CORRECCIONES', 'Requiere ajustes', mockFile, mockAnnotatedFile);
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION,
        message: 'Se ha registrado el veredicto negativo y se solicitarán correcciones.'
      }));
    });

    it('debería mostrar el mensaje del backend si falla el registro', async () => {
      service.preliminaryDraftState.set(createMockDraft());
      service.pendingReviewData.set({
        formValues: { result: stateList.APROBADO, comments: 'Ok' },
        file: mockFile
      });
      preliminaryDraftServiceMock.registerEvaluatorConcept.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 400, error: { message: 'El evaluador ya emitió concepto.' } })));

      await service.processEvaluation();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error al guardar',
        message: 'El evaluador ya emitió concepto.'
      }));
    });
  });

  describe('downloadCurrentDocument()', () => {
    it('debería descargar el documento si hay una revisión activa', async () => {
      service.preliminaryDraftState.set(createMockDraft());

      await service.downloadCurrentDocument();

      expect(downloadServiceMock.download).toHaveBeenCalledWith('url1', 'doc1.pdf');
    });

    it('debería mostrar error si no hay revisión activa para descargar', async () => {
      service.preliminaryDraftState.set(createMockDraft({ documents: [] }));

      await service.downloadCurrentDocument();

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO,
        title: 'Error de descarga'
      }));
    });

    it('debería mostrar error si falla la utilidad de descarga (Exception)', async () => {
      service.preliminaryDraftState.set(createMockDraft());
      downloadServiceMock.download.mockRejectedValue(new Error('Network error'));

      await service.downloadCurrentDocument();

      expect(console.error).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.INFO,
        title: 'Error de descarga'
      }));
    });
  });

  describe('goBack()', () => {
    it('debería navegar a la ruta anterior', () => {
      service.goBack();
      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], expect.any(Object));
    });
  });
});
