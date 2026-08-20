import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { LoadedDocumentsPreliminaryDraftPageComponent } from './loaded-documents-preliminary-draft-page.component';
import { LoadedDocumentsPreliminaryDraftFacadeService } from './services/loaded-documents-preliminary-draft-facade.service';

// Definimos la estructura exacta que consume el template para mantener el tipado estricto
interface MockFacade {
  init: jest.Mock;
  destroy: jest.Mock;
  goBack: jest.Mock;
  tabs: Array<{ id: string; label: string }>;
  currentTableData: WritableSignal<unknown[]>;
  currentColumns: WritableSignal<unknown[]>;
  currentHeaderButtons: WritableSignal<unknown[]>;
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
    // 1. Usamos Signals reales de Angular para simular el comportamiento reactivo exacto
    mockFacade = {
      init: jest.fn(),
      destroy: jest.fn(),
      goBack: jest.fn(),
      tabs: [{ id: 'ANTEPROYECTOS', label: 'Anteproyectos' }],
      currentTableData: signal([]),
      currentColumns: signal([]),
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
    // 2. Sobrescribimos el proveedor inyectado a nivel de componente
    .overrideProvider(LoadedDocumentsPreliminaryDraftFacadeService, { useValue: mockFacade })
    .compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsPreliminaryDraftPageComponent);
    component = fixture.componentInstance;

    // Dispara ngOnInit
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
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
      const tabsComponent = fixture.debugElement.query(By.css('app-tabs'));

      // Simulamos la emisión del evento (tabChange)
      tabsComponent.triggerEventHandler('tabChange', 'PRESENTACIONES');

      expect(mockFacade.activeTab()).toBe('PRESENTACIONES');
    });

    it('debería enlazar correctamente los eventos de app-table-component', () => {
      const tableComponent = fixture.debugElement.query(By.css('app-table-component'));

      const mockEventHeader = { action: 'upload' };
      const mockEventAction = { action: 'delete', row: { id: 1 } };

      tableComponent.triggerEventHandler('headerButtonClick', mockEventHeader);
      tableComponent.triggerEventHandler('actionClick', mockEventAction);

      expect(mockFacade.handleHeaderButton).toHaveBeenCalledWith(mockEventHeader);
      expect(mockFacade.handleTableAction).toHaveBeenCalledWith(mockEventAction);
    });

    it('debería enlazar correctamente los eventos de app-file-upload-modal', () => {
      const uploadModal = fixture.debugElement.query(By.css('app-file-upload-modal'));
      const mockFile = new File([''], 'test.pdf', { type: 'application/pdf' });

      uploadModal.triggerEventHandler('onFileUploaded', mockFile);
      uploadModal.triggerEventHandler('onClose', null);

      expect(mockFacade.onFileSelected).toHaveBeenCalledWith(mockFile);
      expect(mockFacade.isUploadModalOpen()).toBeFalsy();
    });

    it('debería enlazar correctamente los eventos de app-confirmation-action-modal', () => {
      const confirmModal = fixture.debugElement.query(By.css('app-confirmation-action-modal'));

      confirmModal.triggerEventHandler('confirm', null);
      confirmModal.triggerEventHandler('onClose', null);

      expect(mockFacade.confirmUpload).toHaveBeenCalled();
      expect(mockFacade.cancelUpload).toHaveBeenCalled();
    });
  });
});
