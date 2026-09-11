import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';

import { LoadedDocumentsPreliminaryDraftPageComponent } from './loaded-documents-preliminary-draft-page.component';
import { LoadedDocumentsPreliminaryDraftFacadeService } from './services/loaded-documents-preliminary-draft-facade.service';
import { LoadedDocumentsPreliminaryDraftMapperService } from './services/loaded-documents-preliminary-draft-mapper.service';

import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
// 🔹 CORRECCIÓN: Importamos 'Column' en lugar del erróneo 'TableColumn'
import { TableComponent, TableButton, Column } from '../../../../shared/components/table-component/table-component.component';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { UploadContext } from './models/loaded-documents-preliminary-draft-page.model';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

// 🔹 REFACTOR: Mocks de Componentes Hijos para aislar el contenedor
@Component({ selector: 'app-tabs', standalone: true, template: '<div>Mock Tabs</div>' })
class MockTabsComponent {
  @Input() tabs: Array<{ id: string; label: string }> = [];
  @Input() activeTab = '';
  @Output() tabChange = new EventEmitter<string>();
}

@Component({ selector: 'app-table-component', standalone: true, template: '<div>Mock Table</div>' })
class MockTableComponent {
  @Input() value: FileDocument[] = [];
  // 🔹 REFACTOR: Tipado estricto restaurado
  @Input() columns: Column[] = [];
  @Input() paginator = true;
  @Input() headerButtons: TableButton[] = [];
  @Input() emptyMessage = '';
  @Output() headerButtonClick = new EventEmitter<TableButton>();
  @Output() actionClick = new EventEmitter<{ action: string; row: FileDocument }>();
}

@Component({ selector: 'app-file-upload-modal', standalone: true, template: '<div>Mock Upload Modal</div>' })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Input() uploadedBy = '';
  @Output() onFileUploaded = new EventEmitter<UploadContext>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '<div>Mock Confirm Modal</div>' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
}

// 🔹 REFACTOR: Tipado estricto para el Facade (sin 'unknown' ni 'any')
interface MockFacade {
  init: jest.Mock;
  destroy: jest.Mock;
  goBack: jest.Mock;
  tabs: Array<{ id: string; label: string }>;
  currentTableData: WritableSignal<FileDocument[]>;
  // 🔹 REFACTOR: Tipado estricto restaurado aquí también
  currentColumns: WritableSignal<Column[]>;
  currentHeaderButtons: WritableSignal<TableButton[]>;
  emptyMessage: WritableSignal<string>;
  uploadModalDescription: WritableSignal<string>;
  uploadModalUserRole: WritableSignal<string>;
  confirmModalDescription: WritableSignal<string>;
  activeTab: WritableSignal<string>;
  isUploadModalOpen: WritableSignal<boolean>;
  isConfirmModalOpen: WritableSignal<boolean>;
  handleHeaderButton: jest.Mock;
  handleTableAction: jest.Mock;
  onFileSelected: jest.Mock;
  confirmUpload: jest.Mock;
  cancelUpload: jest.Mock;
}

describe('LoadedDocumentsPreliminaryDraftPageComponent', () => {
  let component: LoadedDocumentsPreliminaryDraftPageComponent;
  let fixture: ComponentFixture<LoadedDocumentsPreliminaryDraftPageComponent>;
  let mockFacade: MockFacade;

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Usamos Signals reales de Angular para simular el comportamiento reactivo exacto
    mockFacade = {
      init: jest.fn(),
      destroy: jest.fn(),
      goBack: jest.fn(),
      tabs: [{ id: 'ANTEPROYECTOS', label: 'Anteproyectos' }],
      currentTableData: signal([]),
      currentColumns: signal([]), // Ahora respeta la interfaz Column[]
      currentHeaderButtons: signal([]),
      emptyMessage: signal('Empty message'),
      uploadModalDescription: signal('Upload description'),
      uploadModalUserRole: signal('User Role'),
      confirmModalDescription: signal('Confirm description'),
      activeTab: signal('ANTEPROYECTOS'),
      isUploadModalOpen: signal(false),
      isConfirmModalOpen: signal(false),
      handleHeaderButton: jest.fn(),
      handleTableAction: jest.fn(),
      onFileSelected: jest.fn(),
      confirmUpload: jest.fn(),
      cancelUpload: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoadedDocumentsPreliminaryDraftPageComponent]
    })
    .overrideComponent(LoadedDocumentsPreliminaryDraftPageComponent, {
      remove: {
        // Quitamos los componentes hijos reales y proveedores locales originales
        imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent],
        providers: [LoadedDocumentsPreliminaryDraftFacadeService, LoadedDocumentsPreliminaryDraftMapperService]
      },
      add: {
        // Insertamos los mocks
        imports: [MockFileUploadModalComponent, MockConfirmationActionModalComponent, MockTableComponent, MockTabsComponent],
        providers: [{ provide: LoadedDocumentsPreliminaryDraftFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsPreliminaryDraftPageComponent);
    component = fixture.componentInstance;

    // Dispara ngOnInit
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restauramos la consola
  });

  describe('Ciclo de vida (Lifecycle)', () => {
    it('debería inicializar el facade en ngOnInit', () => {
      expect(mockFacade.init).toHaveBeenCalled();
    });

    it('debería destruir el facade en ngOnDestroy', () => {
      component.ngOnDestroy();
      expect(mockFacade.destroy).toHaveBeenCalled();
    });
  });

  describe('Interacciones de la vista (Template Bindings)', () => {
    it('debería llamar a goBack() al hacer clic en el botón de regresar', () => {
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);

      expect(mockFacade.goBack).toHaveBeenCalled();
    });

    it('debería enlazar correctamente los eventos de app-tabs', () => {
      const tabsComponent = fixture.debugElement.query(By.directive(MockTabsComponent));

      // Simulamos la emisión del evento (tabChange)
      tabsComponent.componentInstance.tabChange.emit('PRESENTACIONES');

      expect(mockFacade.activeTab()).toBe('PRESENTACIONES');
    });

    it('debería enlazar correctamente los eventos de app-table-component', () => {
      const tableComponent = fixture.debugElement.query(By.directive(MockTableComponent));

      const mockEventHeader: TableButton = { label: 'Upload', action: 'upload', variant: 'primary' };
      const mockEventAction = { action: 'delete', row: {} as FileDocument };

      tableComponent.componentInstance.headerButtonClick.emit(mockEventHeader);
      tableComponent.componentInstance.actionClick.emit(mockEventAction);

      expect(mockFacade.handleHeaderButton).toHaveBeenCalledWith(mockEventHeader);
      expect(mockFacade.handleTableAction).toHaveBeenCalledWith(mockEventAction);
    });

    it('debería enlazar correctamente los eventos de app-file-upload-modal', () => {
      const uploadModal = fixture.debugElement.query(By.directive(MockFileUploadModalComponent));

      const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });
      const mockUploadContext: UploadContext = { file: mockFile, fileName: 'test.pdf' };

      uploadModal.componentInstance.onFileUploaded.emit(mockUploadContext);
      uploadModal.componentInstance.onClose.emit();

      expect(mockFacade.onFileSelected).toHaveBeenCalledWith(mockUploadContext);
      expect(mockFacade.isUploadModalOpen()).toBeFalsy();
    });

    it('debería enlazar correctamente los eventos de app-confirmation-action-modal', () => {
      const confirmModal = fixture.debugElement.query(By.directive(MockConfirmationActionModalComponent));

      confirmModal.componentInstance.confirm.emit();
      confirmModal.componentInstance.onClose.emit();

      expect(mockFacade.confirmUpload).toHaveBeenCalled();
      expect(mockFacade.cancelUpload).toHaveBeenCalled();
    });
  });
});
