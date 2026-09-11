import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
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
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';

// 🔹 REFACTOR: Fábricas para generar entidades limpias sin usar 'any' ni 'unknown'
const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  roles: [],
  ...overrides
} as User);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-123',
  documents: [],
  evaluators: [],
  evaluations: [],
  ...overrides
} as PreliminaryDraft);

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: '1',
  name: 'doc',
  type: DocumentType.ANTEPROYECTO,
  url: 'http://url',
  uploadDate: new Date(),
  ...overrides
} as FileDocument);

const createMockTableButton = (overrides: Partial<TableButton> = {}): TableButton => ({
  label: 'Subir',
  action: 'upload_document',
  icon: 'upload',
  variant: 'primary',
  ...overrides
});

describe('LoadedDocumentsPreliminaryDraftFacadeService', () => {
  let facade: LoadedDocumentsPreliminaryDraftFacadeService;

  // 🔹 REFACTOR: Mocks con tipado estructural estricto para evitar Partial y any
  let mockRouter: { navigate: jest.Mock };
  let mockDraftService: {
    allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]>;
    uploadDocument: jest.Mock;
  };
  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock;
  };
  let mockNotificationService: { show: jest.Mock };
  let mockDownloadService: { download: jest.Mock };
  let mockBreadcrumbService: {
    setDynamicBreadcrumb: jest.Mock;
    setDynamicTitle: jest.Mock;
    clearDynamicBreadcrumb: jest.Mock;
  };
  let mockMapperService: {
    buildNewDocumentRecord: jest.Mock;
    getEmptyMessage: jest.Mock;
    getUploadModalDescription: jest.Mock;
    getUploadModalUserRole: jest.Mock;
    getConfirmModalDescription: jest.Mock;
  };

  beforeEach(() => {
    // 🔕 SILENCIAR LA CONSOLA PARA QUITAR EL RUIDO EN LAS PRUEBAS DE ERROR
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    mockRouter = { navigate: jest.fn() };

    mockDraftService = {
      allPreliminaryDrafts: signal([createMockDraft()]),
      uploadDocument: jest.fn().mockReturnValue(of({}))
    };

    mockAuthService = {
      currentUser: signal(createMockUser()),
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

    // Tipado estricto sin usar 'as unknown as ActivatedRoute'
    const mockParamMap = { get: jest.fn().mockReturnValue('draft-123') };
    const mockRoute = {
      snapshot: { paramMap: mockParamMap },
      parent: { snapshot: { paramMap: mockParamMap } }
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
    // 🧹 OBLIGATORIO: Usar restoreAllMocks en lugar de clearAllMocks para devolver la consola a la normalidad
    jest.restoreAllMocks();
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

    it('debería confirmar la subida correctamente y mostrar notificación de éxito', async () => {
      facade.preliminaryDraftId.set('draft-123');
      const mockFile = new File([], 'doc.pdf');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: mockFile });

      const newDoc = createMockDocument();
      mockMapperService.buildNewDocumentRecord.mockResolvedValue(newDoc);
      mockDraftService.uploadDocument.mockReturnValue(of({}));

      await facade.confirmUpload();

      expect(mockMapperService.buildNewDocumentRecord).toHaveBeenCalledWith('doc.pdf', mockFile, expect.any(String));
      expect(mockDraftService.uploadDocument).toHaveBeenCalledWith('draft-123', newDoc);
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'confirmation' }));
    });

    it('debería notificar error si la lectura del archivo falla en el mapper', async () => {
      facade.preliminaryDraftId.set('draft-123');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: new File([], 'doc.pdf') });
      mockMapperService.buildNewDocumentRecord.mockRejectedValue(new Error('Corrupt file'));

      await facade.confirmUpload();

      // Validamos que el flujo se cortó y nunca llamó al backend
      expect(mockDraftService.uploadDocument).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });

    it('debería notificar error si la subida mediante servicio HTTP falla', async () => {
      facade.preliminaryDraftId.set('draft-123');
      facade.uploadContext.set({ fileName: 'doc.pdf', file: new File([], 'doc.pdf') });

      const newDoc = createMockDocument();
      mockMapperService.buildNewDocumentRecord.mockResolvedValue(newDoc);

      // Simulamos que el backend arroja un error
      mockDraftService.uploadDocument.mockReturnValue(throwError(() => new Error('Network error')));

      await facade.confirmUpload();

      // Validamos que el backend sí intentó ser llamado
      expect(mockDraftService.uploadDocument).toHaveBeenCalled();
      // Validamos que el servicio de notificaciones disparó un mensaje de tipo 'error'
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
    });
  });

  describe('Acciones de tabla y botones', () => {
    it('debería navegar hacia atrás', () => {
      facade.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: expect.anything() });
    });

    it('debería abrir el modal de subida al clickear botón del header correspondiente', () => {
      const buttonMock = createMockTableButton({ action: 'upload_document' });

      facade.handleHeaderButton(buttonMock);
      expect(facade.isUploadModalOpen()).toBeTruthy();
    });

    it('debería navegar a una ruta si la acción del botón de cabecera no es upload_document', () => {
      const buttonMock = createMockTableButton({ action: 'other_route' });

      facade.handleHeaderButton(buttonMock);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['other_route'], { relativeTo: expect.anything() });
    });

    it('debería bloquear acción de tabla si no está permitida en allowedActions', () => {
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        ...createMockDocument(),
        allowedActions: ['ver']
      };

      facade.handleTableAction({ action: 'editar', row: mockRow });
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acción no permitida' }));
    });

    it('debería invocar el servicio de descarga y mostrar notificación de inicio', fakeAsync(() => {
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        ...createMockDocument({ name: 'documento', url: 'http://test/doc.pdf' }),
        allowedActions: ['download']
      };

      facade.handleTableAction({ action: 'download', row: mockRow });
      tick();

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Descarga iniciada' }));
      expect(mockDownloadService.download).toHaveBeenCalledWith('http://test/doc.pdf', 'documento.pdf');
    }));

    it('debería mostrar error si se intenta descargar pero no existe una URL válida', () => {
      const mockRow: FileDocument & { allowedActions?: string[] } = {
        ...createMockDocument({ name: 'documento', url: '' }), // URL inválida
        allowedActions: ['download']
      };

      facade.handleTableAction({ action: 'download', row: mockRow });

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Error de descarga' }));
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });
  });
});
