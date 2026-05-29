import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftPageComponent } from './loaded-documents-preliminary-draft-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { of } from 'rxjs';
import { signal, Component, Input, Output, EventEmitter } from '@angular/core';

// Servicios
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';

// Reales para Override (Necesarios para que el compilador los reconozca antes de quitarlos)
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { TableComponent, TableButton } from '../../../../shared/components/table-component/table-component.component';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';

// Enums y Tipos
import { stateList } from '../../../../core/enums/state.enum';
import { UserRoleType } from '../../../../core/models/user-role';

// --- MOCKS DE COMPONENTES INTERNOS ---
@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockUploadModal { @Input() isOpen = false; @Output() fileSelected = new EventEmitter<any>(); }

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmModal { @Input() isOpen = false; @Input() isProcessing = false; @Output() confirm = new EventEmitter<void>(); @Output() cancel = new EventEmitter<void>(); }

@Component({ selector: 'app-table-component', template: '', standalone: true })
class MockTable { @Input() columns: any; @Input() data: any; @Input() headerButtons: any; @Output() action = new EventEmitter<any>(); @Output() headerButtonClicked = new EventEmitter<any>(); }

@Component({ selector: 'app-tabs', template: '', standalone: true })
class MockTabs { @Input() tabs: any; @Input() activeTab: any; @Output() tabChange = new EventEmitter<string>(); }

describe('LoadedDocumetsPreliminaryDraftPageComponent', () => {
  let component: LoadedDocumentsPreliminaryDraftPageComponent;
  let fixture: ComponentFixture<LoadedDocumentsPreliminaryDraftPageComponent>;

  // Mocks de Servicios
  let preliminaryDraftServiceMock: any;
  let authServiceMock: any;
  let notificationServiceMock: any;
  let breadcrumbServiceMock: any;
  let routerMock: any;
  let downloadServiceMock: any;

  const mockDraft = {
    preliminaryDraftId: 'draft-123',
    state: stateList.EN_REVISION,
    evaluators: [{ id: 'eval-1', name: 'Evaluador 1' }],
    documents: [
      { id: 'doc-1', name: 'Doc 1', type: 'Anteproyecto', status: stateList.EN_REVISION, url: 'url-1' }
    ],
    evaluations: []
  };

  beforeEach(async () => {
    preliminaryDraftServiceMock = {
      preliminaryDrafts: signal([mockDraft]),
      calculateDocumentStatus: jest.fn().mockReturnValue(stateList.EN_REVISION),
      uploadDocumentMock: jest.fn().mockReturnValue(of({}))
    };

    authServiceMock = {
      currentUser: signal({ id: 'eval-1', firstName: 'Evaluador', lastName: '1' }),
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    downloadServiceMock = {
      download: jest.fn().mockResolvedValue(undefined)
    };

    notificationServiceMock = { show: jest.fn() };
    breadcrumbServiceMock = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn()
    };
    routerMock = { navigate: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [LoadedDocumentsPreliminaryDraftPageComponent],
      providers: [
        { provide: PreliminaryDraftService, useValue: preliminaryDraftServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: BreadcrumbService, useValue: breadcrumbServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: FileDownloadService, useValue: downloadServiceMock },
        { provide: Title, useValue: { setTitle: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => 'draft-123' } },
            parent: null
          }
        }
      ]
    })
    .overrideComponent(LoadedDocumentsPreliminaryDraftPageComponent, {
      remove: {
        imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent]
      },
      add: {
        imports: [MockUploadModal, MockConfirmModal, MockTable, MockTabs]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsPreliminaryDraftPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería cargar el ID del anteproyecto desde la ruta', () => {
    expect(component.preliminaryDraftId()).toBe('draft-123');
  });

  describe('Reactividad y Breadcrumbs', () => {
    it('debería actualizar el breadcrumb cuando cambia el tab', () => {
      component.activeTab.set('PRESENTACIONES');
      fixture.detectChanges();
      expect(breadcrumbServiceMock.setDynamicBreadcrumb).toHaveBeenCalledWith('Presentaciones al consejo de facultad');
    });
  });

  describe('Lógica de Datos y Acciones', () => {
    it('debería filtrar documentos por la pestaña activa', () => {
      component.activeTab.set('ANTEPROYECTOS');
      const data = component.currentTableData();
      expect(data.length).toBe(1);
      expect(data[0].type).toBe('Anteproyecto');
    });

    it('debería llamar al servicio de descarga cuando se ejecuta la acción download', () => {
      const mockDoc = { id: '1', name: 'archivo', url: 'http://test.com/file.pdf', allowedActions: ['download'] };
      component.handleTableAction({ action: 'download', row: mockDoc });
      expect(downloadServiceMock.download).toHaveBeenCalledWith('http://test.com/file.pdf', 'archivo.pdf');
    });

    it('debería navegar a la página de asignación si el usuario es Jefe de Departamento', () => {
      authServiceMock.hasAnyRole.mockImplementation((roles: any) => roles.includes(UserRoleType.JEFE_DEP));
      const button: TableButton = { label: 'Asignar evaluadores', variant: 'primary' };

      component.handleHeaderButton(button);
      expect(routerMock.navigate).toHaveBeenCalledWith(['assign_evaluators'], expect.anything());
    });
  });

  describe('Carga de Documentos', () => {
    it('debería abrir el modal de confirmación tras seleccionar un archivo', () => {
      const mockFile = new File([''], 'test.pdf');
      component.onFileSelected({ fileName: 'test.pdf', file: mockFile });

      expect(component.isConfirmModalOpen()).toBe(true);
      expect(component.uploadContext()?.fileName).toBe('test.pdf');
    });

    it('debería procesar la carga exitosamente', () => {
      const mockFile = new File([''], 'test.pdf');
      component.uploadContext.set({ fileName: 'test.pdf', file: mockFile });

      component.confirmUpload();

      expect(preliminaryDraftServiceMock.uploadDocumentMock).toHaveBeenCalled();

      // Ajuste: 'confirmation' en minúsculas para coincidir con la lógica del componente
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: 'confirmation',
        title: '¡Carga exitosa!'
      }));
    });
  });

  it('debería limpiar estados al destruir el componente', () => {
    component.ngOnDestroy();
    expect(breadcrumbServiceMock.clearDynamicBreadcrumb).toHaveBeenCalled();
  });
});
