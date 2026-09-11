import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';

import { LoadedProposalsPageComponent } from './loaded-proposals-page.component';
import { LoadedProposalsFacadeService } from './services/loaded-proposals-facade.service';
import { DocumentTableRow } from './models/loaded-proposals-page.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

describe('LoadedProposalsPageComponent', () => {
  let component: LoadedProposalsPageComponent;
  let fixture: ComponentFixture<LoadedProposalsPageComponent>;

  // Espías para silenciar la consola
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  // Mocks estrictamente tipados sin usar 'any'
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: unknown; // Usamos unknown como puente seguro para la estructura compleja de ActivatedRoute
  let mockFacade: jest.Mocked<LoadedProposalsFacadeService>;

  beforeEach(async () => {
    // Silenciamos la consola para evitar ruido en los tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouter = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    mockRoute = {
      parent: {
        snapshot: {
          paramMap: {
            get: jest.fn().mockReturnValue('prop-123')
          }
        }
      }
    };

    mockFacade = {
      buildDocumentsTableData: jest.fn().mockReturnValue([]),
      buildHeaderButtons: jest.fn().mockReturnValue([]),
      showRestrictedActionNotification: jest.fn(),
      handleDownload: jest.fn().mockResolvedValue(undefined),
      canUpload: jest.fn().mockReturnValue(true),
      upload: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<LoadedProposalsFacadeService>;

    await TestBed.configureTestingModule({
      imports: [LoadedProposalsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: LoadedProposalsFacadeService, useValue: mockFacade }
      ]
    })
    // Para simplificar las pruebas unitarias del componente principal y no
    // depender de los hijos standalone, podemos sobreescribir el template
    // o simplemente dejar que Angular construya el shallow tree.
    .compileComponents();

    fixture = TestBed.createComponent(LoadedProposalsPageComponent);
    component = fixture.componentInstance;

    // Forzamos la detección de cambios para ejecutar ngOnInit
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente y obtener el proposalId de la ruta', () => {
      expect(component).toBeTruthy();
      expect(component.proposalId()).toBe('prop-123');
    });

    it('debería delegar al facade la construcción de datos de la tabla y botones', () => {
      // Al ser computed, leemos su valor para forzar la ejecución
      component.documentsTableData();
      component.headerButtons();

      expect(mockFacade.buildDocumentsTableData).toHaveBeenCalledWith('prop-123');
      expect(mockFacade.buildHeaderButtons).toHaveBeenCalledWith('prop-123');
    });
  });

  describe('Método: handleTableAction', () => {
    const mockRow = { id: 'doc-1', allowedActions: [] } as unknown as DocumentTableRow;

    it('debería notificar y detener la ejecución si la acción no está permitida', () => {
      component.handleTableAction({ action: 'download', row: mockRow });

      expect(mockFacade.showRestrictedActionNotification).toHaveBeenCalled();
      expect(mockFacade.handleDownload).not.toHaveBeenCalled();
    });

    it('debería delegar a handleDownload si la acción es "download" y está permitida', () => {
      const allowedRow = { ...mockRow, allowedActions: ['download'] } as DocumentTableRow;

      component.handleTableAction({ action: 'download', row: allowedRow });

      expect(mockFacade.handleDownload).toHaveBeenCalledWith(allowedRow);
    });

    it('debería navegar a evaluate_proposal si la acción es "evaluate" y está permitida', () => {
      const allowedRow = { ...mockRow, allowedActions: ['evaluate'] } as DocumentTableRow;

      component.handleTableAction({ action: 'evaluate', row: allowedRow });

      expect(mockRouter.navigate).toHaveBeenCalledWith(['evaluate_proposal'], { relativeTo: mockRoute });
    });
  });

  describe('Método: handleHeaderButton', () => {
    it('debería ignorar la acción si no es "upload_correction"', () => {
      component.handleHeaderButton({ action: 'otra_accion' } as TableButton);

      expect(mockFacade.canUpload).not.toHaveBeenCalled();
      expect(component.fileModalOpen()).toBe(false);
    });

    it('debería detenerse si no tiene permisos para cargar (canUpload = false)', () => {
      mockFacade.canUpload.mockReturnValue(false);

      component.handleHeaderButton({ action: 'upload_correction' } as TableButton);

      expect(component.fileModalOpen()).toBe(false);
    });

    it('debería abrir el modal de archivos si la acción es correcta y tiene permisos', () => {
      mockFacade.canUpload.mockReturnValue(true);

      component.handleHeaderButton({ action: 'upload_correction' } as TableButton);

      expect(component.fileModalOpen()).toBe(true);
    });
  });

  describe('Flujo de Carga (Upload)', () => {
    const mockFileData = { fileName: 'test.pdf', file: new File([], 'test.pdf') };

    it('onFileSelected debería establecer el estado de carga y cambiar de modal', () => {
      // Simular estado previo
      component.fileModalOpen.set(true);

      component.onFileSelected(mockFileData);

      expect(component.uploadState()).toEqual(mockFileData);
      expect(component.fileModalOpen()).toBe(false);
      expect(component.confirmModalOpen()).toBe(true);
    });

    it('cancelUpload debería cerrar el modal de confirmación y limpiar el estado', () => {
      component.uploadState.set(mockFileData);
      component.confirmModalOpen.set(true);

      component.cancelUpload();

      expect(component.confirmModalOpen()).toBe(false);
      expect(component.uploadState()).toBeNull();
    });

    it('confirmUpload no debería hacer nada si no hay archivo seleccionado', () => {
      component.uploadState.set(null); // Sin archivo

      component.confirmUpload();

      expect(mockFacade.upload).not.toHaveBeenCalled();
    });

    it('confirmUpload debería llamar al facade y manejar el callback onSuccess correctamente', () => {
      // Preparamos el estado
      component.uploadState.set(mockFileData);
      component.confirmModalOpen.set(true);

      // Simulamos que el Facade invoca el onSuccess (tercer argumento) inmediatamente
      mockFacade.upload.mockImplementation((id, fileData, onSuccess, onError) => {
        onSuccess();
        return Promise.resolve();
      });

      component.confirmUpload();

      expect(mockFacade.upload).toHaveBeenCalledWith(
        'prop-123',
        mockFileData,
        expect.any(Function), // Callback onSuccess
        expect.any(Function)  // Callback onError
      );

      // Verificamos que el callback limpió todo correctamente
      expect(component.confirmModalOpen()).toBe(false);
      expect(component.uploadState()).toBeNull();
    });
  });

  describe('Navegación', () => {
    it('goBack debería navegar un nivel arriba en la ruta', () => {
      component.goBack();

      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
    });
  });
});
