import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadedDocumentsPreliminaryDraftPageComponent } from './loaded-documents-preliminary-draft-page.component';
import { LoadedDocumentsPreliminaryDraftFacadeService } from './services/loaded-documents-preliminary-draft-facade.service';

// Definimos un tipo estricto para el Mock, reemplazando el uso de 'any'
type MockFacadeType = {
  init: jest.Mock;
  destroy: jest.Mock;
  goBack: jest.Mock;
  tabs: Array<{ id: string; label: string }>;
  currentTableData: jest.Mock;
  currentColumns: jest.Mock;
  currentHeaderButtons: jest.Mock;
  emptyMessage: jest.Mock;
  uploadModalDescription: jest.Mock;
  uploadModalUserRole: jest.Mock;
  confirmModalDescription: jest.Mock;
  activeTab: jest.Mock & { set: jest.Mock };
  isUploadModalOpen: jest.Mock & { set: jest.Mock };
  isConfirmModalOpen: jest.Mock & { set: jest.Mock };
  handleHeaderButton: jest.Mock;
  handleTableAction: jest.Mock;
  onFileSelected: jest.Mock;
  confirmUpload: jest.Mock;
  cancelUpload: jest.Mock;
};

describe('LoadedDocumentsPreliminaryDraftPageComponent', () => {
  let component: LoadedDocumentsPreliminaryDraftPageComponent;
  let fixture: ComponentFixture<LoadedDocumentsPreliminaryDraftPageComponent>;
  let mockFacade: MockFacadeType; // Uso del tipo estricto

  beforeEach(async () => {
    mockFacade = {
      init: jest.fn(),
      destroy: jest.fn(),
      goBack: jest.fn(),
      tabs: [{ id: 'ANTEPROYECTOS', label: 'Anteproyectos' }],
      currentTableData: jest.fn().mockReturnValue([]),
      currentColumns: jest.fn().mockReturnValue([]),
      currentHeaderButtons: jest.fn().mockReturnValue([]),
      emptyMessage: jest.fn().mockReturnValue('Empty'),
      uploadModalDescription: jest.fn().mockReturnValue('Descripción mock'),
      uploadModalUserRole: jest.fn().mockReturnValue('Rol mock'),
      confirmModalDescription: jest.fn().mockReturnValue('Confirmación mock'),
      activeTab: Object.assign(jest.fn().mockReturnValue('ANTEPROYECTOS'), { set: jest.fn() }),
      isUploadModalOpen: Object.assign(jest.fn().mockReturnValue(false), { set: jest.fn() }),
      isConfirmModalOpen: Object.assign(jest.fn().mockReturnValue(false), { set: jest.fn() }),
      handleHeaderButton: jest.fn(),
      handleTableAction: jest.fn(),
      onFileSelected: jest.fn(),
      confirmUpload: jest.fn(),
      cancelUpload: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoadedDocumentsPreliminaryDraftPageComponent]
    })
    .overrideProvider(LoadedDocumentsPreliminaryDraftFacadeService, { useValue: mockFacade })
    .compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsPreliminaryDraftPageComponent);
    component = fixture.componentInstance;
  });

  it('debería inicializar el facade en ngOnInit', () => {
    fixture.detectChanges();
    expect(mockFacade.init).toHaveBeenCalled();
  });

  it('debería destruir el facade en ngOnDestroy', () => {
    fixture.detectChanges();
    component.ngOnDestroy();
    expect(mockFacade.destroy).toHaveBeenCalled();
  });
});
