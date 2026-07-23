import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { LoadedDocumentsPreliminaryDraftFacadeService } from './loaded-documents-preliminary-draft-facade.service';
import { LoadedDocumentsPreliminaryDraftMapperService } from './loaded-documents-preliminary-draft-mapper.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../../core/services/breadcrumb/breadcrumb.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

describe('LoadedDocumentsPreliminaryDraftFacadeService', () => {
  let facade: LoadedDocumentsPreliminaryDraftFacadeService;

  // Mocks con tipado estricto
  let mockRoute: any;
  let mockRouter: { navigate: jest.Mock };
  let mockDraftService: { allPreliminaryDrafts: jest.Mock; uploadDocument: jest.Mock };
  let mockAuthService: { currentUser: jest.Mock; hasAnyRole: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockDownloadService: { download: jest.Mock };
  let mockBreadcrumbService: { setDynamicBreadcrumb: jest.Mock; setDynamicTitle: jest.Mock; clearDynamicBreadcrumb: jest.Mock };

  beforeEach(() => {
    mockRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('draft-123') } },
      parent: { snapshot: { paramMap: { get: jest.fn() } } }
    };
    mockRouter = { navigate: jest.fn() };
    mockDraftService = {
      allPreliminaryDrafts: jest.fn().mockReturnValue([{ preliminaryDraftId: 'draft-123' }]),
      uploadDocument: jest.fn().mockReturnValue(of({}))
    };
    mockAuthService = {
      currentUser: jest.fn().mockReturnValue({ id: 'user-1' }),
      hasAnyRole: jest.fn().mockReturnValue(true)
    };
    mockNotificationService = { show: jest.fn() };
    mockDownloadService = { download: jest.fn() };
    mockBreadcrumbService = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        LoadedDocumentsPreliminaryDraftFacadeService,
        LoadedDocumentsPreliminaryDraftMapperService,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: Title, useValue: { setTitle: jest.fn() } }
      ]
    });

    facade = TestBed.inject(LoadedDocumentsPreliminaryDraftFacadeService);
  });

  it('debería inicializar el id desde la ruta', () => {
    facade.init();
    expect(facade.preliminaryDraftId()).toBe('draft-123');
  });

  it('debería manejar la selección de archivos y abrir modal de confirmación', () => {
    const mockFile = new File([''], 'test.pdf');
    facade.onFileSelected({ fileName: 'test.pdf', file: mockFile });

    expect(facade.uploadContext()?.fileName).toBe('test.pdf');
    expect(facade.isUploadModalOpen()).toBeFalsy();
    expect(facade.isConfirmModalOpen()).toBeTruthy();
  });

  it('debería cancelar la subida de documentos', () => {
    facade.isConfirmModalOpen.set(true);
    facade.uploadContext.set({ fileName: 'test', file: new File([], '') });

    facade.cancelUpload();

    expect(facade.isConfirmModalOpen()).toBeFalsy();
    expect(facade.uploadContext()).toBeNull();
  });

  it('debería confirmar la subida correctamente', () => {
    facade.preliminaryDraftId.set('draft-123');
    facade.uploadContext.set({ fileName: 'test.pdf', file: new File([], '') });

    facade.confirmUpload();

    expect(mockDraftService.uploadDocument).toHaveBeenCalled();
    expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: '¡Carga exitosa!' }));
  });

  it('debería navegar hacia atrás', () => {
    facade.goBack();
    expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
  });

  describe('Table Actions', () => {
    it('debería bloquear acción si no está en allowedActions', () => {
      const mockRow = { allowedActions: ['ver'] } as unknown as FileDocument & { allowedActions: string[] };
      facade.handleTableAction({ action: 'editar', row: mockRow });

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acción no permitida' }));
    });

    it('debería ejecutar descarga si la acción es "download"', () => {
      const mockRow = { url: 'http://test', name: 'doc', allowedActions: ['download'] } as unknown as FileDocument & { allowedActions: string[] };
      facade.handleTableAction({ action: 'download', row: mockRow });

      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test', 'doc.pdf');
    });
  });
});
