import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoadedProposalsPageComponent } from './loaded-proposals-page.component';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadedProposalsFacadeService } from './services/loaded-proposals-facade.service';
import { Component } from '@angular/core';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { DocumentTableRow } from './models/loaded-proposals-page.model';

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {}

@Component({ selector: 'app-file-upload-modal', standalone: true, template: '' })
class MockFileUploadModalComponent {}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {}

describe('LoadedProposalsPageComponent', () => {
  let component: LoadedProposalsPageComponent;
  let fixture: ComponentFixture<LoadedProposalsPageComponent>;

  // 2. Tipamos estrictamente las funciones de Jest en nuestras variables mock
  let mockRouter: { navigate: jest.Mock };
  let mockRoute: { parent: { snapshot: { paramMap: { get: jest.Mock } } } };
  let mockFacade: {
    buildDocumentsTableData: jest.Mock;
    buildHeaderButtons: jest.Mock;
    handleDownload: jest.Mock;
    canUpload: jest.Mock;
    upload: jest.Mock;
  };

  beforeEach(async () => {
    // 3. Inicializamos los mocks respetando el tipado anterior
    mockRouter = {
      navigate: jest.fn(),
    };

    mockRoute = {
      parent: {
        snapshot: {
          paramMap: {
            get: jest.fn().mockReturnValue('123'),
          },
        },
      },
    };

    mockFacade = {
      buildDocumentsTableData: jest.fn().mockReturnValue([]),
      buildHeaderButtons: jest.fn().mockReturnValue([]),
      handleDownload: jest.fn(),
      canUpload: jest.fn(),
      upload: jest.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [LoadedProposalsPageComponent],
      providers: [
        // 4. Casteamos a "unknown" y luego al tipo real para que Angular no exija implementar todos los métodos
        { provide: Router, useValue: mockRouter as unknown as Router },
        { provide: ActivatedRoute, useValue: mockRoute as unknown as ActivatedRoute },
        { provide: LoadedProposalsFacadeService, useValue: mockFacade as unknown as LoadedProposalsFacadeService },
      ],
    })
      .overrideComponent(LoadedProposalsPageComponent, {
        remove: {
          imports: [
            TableComponent,
            FileUploadModalComponent,
            ConfirmationActionModalComponent
          ],
        },
        add: {
          imports: [
            MockTableComponent,
            MockFileUploadModalComponent,
            MockConfirmationActionModalComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(LoadedProposalsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('debe establecer el proposalId si existe en la ruta padre', () => {
      expect(component.proposalId()).toBe('123');
    });

    it('NO debe establecer el proposalId si no viene en la ruta', () => {
      mockRoute.parent.snapshot.paramMap.get.mockReturnValue(null);

      const newFixture = TestBed.createComponent(LoadedProposalsPageComponent);
      const newComponent = newFixture.componentInstance;
      newFixture.detectChanges();

      expect(newComponent.proposalId()).toBeNull();
    });
  });

  describe('Signals Computados', () => {
    it('debe llamar al facade para construir la tabla y los botones', () => {
      component.documentsTableData();
      component.headerButtons();

      expect(mockFacade.buildDocumentsTableData).toHaveBeenCalledWith('123');
      expect(mockFacade.buildHeaderButtons).toHaveBeenCalledWith('123');
    });
  });

  describe('handleTableAction', () => {
    it('NO debe hacer nada si la acción no está permitida', () => {
      // 5. Casteamos de forma segura como Partial y luego como el modelo final
      const mockRow = { allowedActions: ['download'] } as unknown as DocumentTableRow;
      component.handleTableAction({ action: 'evaluate', row: mockRow });

      expect(mockFacade.handleDownload).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debe delegar la descarga al facade cuando la acción es "download"', () => {
      const mockRow = { allowedActions: ['download'] } as unknown as DocumentTableRow;
      component.handleTableAction({ action: 'download', row: mockRow });

      expect(mockFacade.handleDownload).toHaveBeenCalledWith(mockRow);
    });

    it('debe navegar a "evaluate_proposal" cuando la acción es "evaluate"', () => {
      const mockRow = { allowedActions: ['evaluate'] } as unknown as DocumentTableRow;
      component.handleTableAction({ action: 'evaluate', row: mockRow });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['evaluate_proposal'], { relativeTo: mockRoute as unknown as ActivatedRoute });
    });
  });

  describe('Gestión de Archivos (Modales y Upload)', () => {
    it('handleHeaderButton NO debe abrir el modal si el facade indica que no se puede subir', () => {
      mockFacade.canUpload.mockReturnValue(false);
      component.handleHeaderButton();
      expect(component.fileModalOpen()).toBeFalsy();
    });

    it('handleHeaderButton debe abrir el modal si se permite subir archivos', () => {
      mockFacade.canUpload.mockReturnValue(true);
      component.handleHeaderButton();
      expect(component.fileModalOpen()).toBeTruthy();
    });

    it('onFileSelected debe guardar el archivo, cerrar modal de archivo y abrir confirmación', () => {
      const fileData = { fileName: 'test.pdf', file: new File([], 'test.pdf') };
      component.fileModalOpen.set(true);

      component.onFileSelected(fileData);

      expect(component.uploadState()).toEqual(fileData);
      expect(component.fileModalOpen()).toBeFalsy();
      expect(component.confirmModalOpen()).toBeTruthy();
    });

    it('cancelUpload debe cerrar modal de confirmación y limpiar el archivo', () => {
      component.confirmModalOpen.set(true);
      component.uploadState.set({ fileName: 'x', file: {} as File });

      component.cancelUpload();

      expect(component.confirmModalOpen()).toBeFalsy();
      expect(component.uploadState()).toBeNull();
    });

    it('confirmUpload NO debe llamar al facade si no hay fileData o id', () => {
      component.uploadState.set(null);
      component.confirmUpload();
      expect(mockFacade.upload).not.toHaveBeenCalled();
    });

    it('confirmUpload debe delegar al facade y limpiar el estado en el callback de éxito', () => {
      const fileData = { fileName: 'test.pdf', file: new File([], 'test.pdf') };
      component.uploadState.set(fileData);
      component.confirmModalOpen.set(true);

      component.confirmUpload();

      expect(mockFacade.upload).toHaveBeenCalledWith(
        '123',
        fileData,
        expect.any(Function),
        expect.any(Function)
      );

      const onSuccessCallback = mockFacade.upload.mock.calls[0][2];
      onSuccessCallback();

      expect(component.confirmModalOpen()).toBeFalsy();
      expect(component.uploadState()).toBeNull();

      const onErrorCallback = mockFacade.upload.mock.calls[0][3];
      onErrorCallback();
    });
  });

  describe('goBack', () => {
    it('debe navegar a la ruta anterior relativa a la actual', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute as unknown as ActivatedRoute });
    });
  });
});
