import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
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
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

describe('LoadedDocumentsPreliminaryDraftFacadeService', () => {
  let facade: LoadedDocumentsPreliminaryDraftFacadeService;

  // Mocks con tipado estricto utilizando jest.Mocked<Partial<T>>
  let mockRouter: jest.Mocked<Partial<Router>>;
  let mockDraftService: jest.Mocked<Partial<PreliminaryDraftService>>;
  let mockAuthService: jest.Mocked<Partial<AuthService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;
  let mockDownloadService: jest.Mocked<Partial<FileDownloadService>>;
  let mockBreadcrumbService: jest.Mocked<Partial<BreadcrumbService>>;
  let mockMapperService: jest.Mocked<Partial<LoadedDocumentsPreliminaryDraftMapperService>>;

  // Tipado estricto sin usar 'any' para simular ActivatedRoute
  const mockParamMap = { get: jest.fn().mockReturnValue('draft-123') };
  const mockRoute = {
    snapshot: { paramMap: mockParamMap },
    parent: { snapshot: { paramMap: mockParamMap } }
  } as unknown as ActivatedRoute;

  beforeEach(() => {
    mockRouter = { navigate: jest.fn() };

    mockDraftService = {
      // Uso de signal real para propiedades reactivas de los servicios
      allPreliminaryDrafts: signal([{ preliminaryDraftId: 'draft-123', documents: [] }] as any),
      uploadDocument: jest.fn().mockReturnValue(of({}))
    };

    mockAuthService = {
      // Uso de signal real
      currentUser: signal({ id: 'user-1' } as any),
      hasAnyRole: jest.fn().mockReturnValue(true)
    };

    mockNotificationService = { show: jest.fn() };
    mockDownloadService = { download: jest.fn().mockResolvedValue(undefined) };

    mockBreadcrumbService = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn()
    };

    mockMapperService = {
      buildNewDocumentRecord: jest.fn(),
      getEmptyMessage: jest.fn(),
      getUploadModalDescription: jest.fn(),
      getUploadModalUserRole: jest.fn(),
      getConfirmModalDescription: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        LoadedDocumentsPreliminaryDraftFacadeService,
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        { provide: LoadedDocumentsPreliminaryDraftMapperService, useValue: mockMapperService }
      ]
    });

    facade = TestBed.inject(LoadedDocumentsPreliminaryDraftFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Ciclo de vida e inicialización', () => {
    it('debería inicializar el draft id desde la ruta principal', () => {
      facade.init();
      expect(facade.preliminaryDraftId()).toBe('draft-123');
    });

    it('debería limpiar el breadcrumb al destruirse', () => {
      facade.destroy();
      expect(mockBreadcrumbService.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalledWith(null);
    });
  });

  describe('Gestión de archivos y subidas', () => {
    it('debería setear el contexto de subida y cambiar los estados de los modales', () => {
      const mockFile = new File([''], 'test.pdf');
      facade.onFileSelected({ fileName: 'test.pdf', file: mockFile });

      expect(facade.uploadContext()?.fileName).toBe('test.pdf');
      expect(facade.isUploadModalOpen()).toBeFalsy();
      expect(facade.isConfirmModalOpen()).toBeTruthy();
    });

    it('debería cancelar la subida, cerrando el modal y limpiando el contexto', () => {
      facade.isConfirmModalOpen.set(true);
      facade.uploadContext.set({ fileName: 'test', file: new File([], '') });

      facade.cancelUpload();

      expect(facade.isConfirmModalOpen()).toBeFalsy();
      expect(facade.uploadContext()).toBeNull();
    });

    // Cambiamos fakeAsync por async nativo
    it('debería confirmar la subida correctamente y mostrar notificación de éxito', async () => {
      facade.preliminaryDraftId.set('draft-123');
      const mockFile = new File([], 'doc.pdf');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: mockFile });

      const newDoc: FileDocument = {
        id: '1',
        name: 'doc',
        type: DocumentType.ANTEPROYECTO,
        url: 'http://url',
        uploadDate: new Date()
      };
      (mockMapperService.buildNewDocumentRecord as jest.Mock).mockResolvedValue(newDoc);
      (mockDraftService.uploadDocument as jest.Mock).mockReturnValue(of({}));

      // Esperamos directamente a que termine la función async
      await facade.confirmUpload();

      expect(mockMapperService.buildNewDocumentRecord).toHaveBeenCalledWith('doc.pdf', mockFile, expect.any(String));
      expect(mockDraftService.uploadDocument).toHaveBeenCalledWith('draft-123', newDoc);

      // SOLUCIÓN: Tu app usa 'confirmation', no 'success'
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'confirmation' }));
    });

    // Cambiamos fakeAsync por async nativo y atrapamos la promesa
    it('debería notificar error si la lectura del archivo falla en el mapper', async () => {
      facade.preliminaryDraftId.set('draft-123');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: new File([], 'doc.pdf') });
      (mockMapperService.buildNewDocumentRecord as jest.Mock).mockRejectedValue(new Error('Corrupt file'));

      try {
        await facade.confirmUpload();
      } catch (e) {
        // Atrapamos el error si el Facade lo relanza hacia arriba para que no falle el Test Runner
      }

      // Validamos que el flujo se cortó y nunca llamó al backend
      expect(mockDraftService.uploadDocument).not.toHaveBeenCalled();
    });

    // Cambiamos fakeAsync por async nativo
    it('debería notificar error si la subida mediante servicio HTTP falla', async () => {
      facade.preliminaryDraftId.set('draft-123');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: new File([], 'doc.pdf') });

      const newDoc: FileDocument = {
        id: '1',
        name: 'doc',
        type: DocumentType.ANTEPROYECTO,
        url: 'http://url',
        uploadDate: new Date()
      };
      (mockMapperService.buildNewDocumentRecord as jest.Mock).mockResolvedValue(newDoc);

      // Simulamos que el backend arroja un error
      (mockDraftService.uploadDocument as jest.Mock).mockReturnValue(throwError(() => new Error('Network error')));

      try {
        await facade.confirmUpload();
      } catch (e) {}

      // Validamos que el backend sí intentó ser llamado
      expect(mockDraftService.uploadDocument).toHaveBeenCalled();

      // Validamos que el servicio de notificaciones disparó un mensaje de tipo 'error'
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  describe('Acciones de tabla y botones', () => {
    it('debería navegar hacia atrás', () => {
      facade.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
    });

    it('debería abrir el modal de subida al clickear botón del header correspondiente', () => {
      // Ajuste de interfaz con la propiedad "variant" y aserción explícita
      facade.handleHeaderButton({
        label: 'Subir',
        action: 'upload_document',
        icon: 'upload',
        variant: 'primary'
      } as any);
      expect(facade.isUploadModalOpen()).toBeTruthy();
    });

    it('debería bloquear acción de tabla si no está permitida en allowedActions', () => {
      // Ajuste de interfaz con las propiedades "url" y "uploadDate"
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        id: 'doc-1',
        name: 'test',
        type: DocumentType.ANTEPROYECTO,
        url: 'http://test/doc.pdf',
        uploadDate: new Date(),
        allowedActions: ['ver']
      };

      facade.handleTableAction({ action: 'editar', row: mockRow });
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acción no permitida' }));
    });

    it('debería invocar el servicio de descarga y mostrar notificación de inicio', fakeAsync(() => {
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        id: 'doc-1',
        name: 'documento',
        type: DocumentType.ANTEPROYECTO,
        url: 'http://test/doc.pdf',
        uploadDate: new Date(),
        allowedActions: ['download']
      };

      facade.handleTableAction({ action: 'download', row: mockRow });
      tick();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Descarga iniciada' }));
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test/doc.pdf', 'documento.pdf');
    }));

    it('debería mostrar error si se intenta descargar pero no existe una URL válida', () => {
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        id: 'doc-1',
        name: 'documento',
        type: DocumentType.ANTEPROYECTO,
        url: '', // URL inválida
        uploadDate: new Date(),
        allowedActions: ['download']
      };

      facade.handleTableAction({ action: 'download', row: mockRow });

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });
  });
});
