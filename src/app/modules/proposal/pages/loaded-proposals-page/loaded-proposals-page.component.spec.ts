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
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: unknown;
  let mockFacade: jest.Mocked<LoadedProposalsFacadeService>;

  beforeEach(async () => {
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
      buildRegistrationDetails: jest.fn().mockReturnValue(null),
      downloadRegistrationDocument: jest.fn().mockResolvedValue(undefined),
      canUpload: jest.fn().mockReturnValue(true),
      requiresAcceptanceLetter: jest.fn().mockReturnValue(false),
      showAcceptanceLetterRequiredNotification: jest.fn(),
      upload: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<LoadedProposalsFacadeService>;

    await TestBed.configureTestingModule({
      imports: [LoadedProposalsPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: LoadedProposalsFacadeService, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadedProposalsPageComponent);
    component = fixture.componentInstance;
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
      component.documentsTableData();
      component.headerButtons();
      expect(mockFacade.buildDocumentsTableData).toHaveBeenCalledWith('prop-123');
      expect(mockFacade.buildHeaderButtons).toHaveBeenCalledWith('prop-123');
    });
  });

  describe('Método: handleTableAction', () => {
    const mockRow = { id: 'doc-1', allowedActions: [] } as unknown as DocumentTableRow;

    it('debería notificar y detener la ejecución si la acción no está permitida', () => {
      component.handleTableAction({ action: 'view-details', row: mockRow });
      expect(mockFacade.showRestrictedActionNotification).toHaveBeenCalled();
      expect(component.selectedRow()).toBeNull();
    });

    it('"Ver detalles" abre el modal con el registro y lo cierra al salir', () => {
      const allowedRow = { ...mockRow, allowedActions: ['view-details'] } as DocumentTableRow;
      component.handleTableAction({ action: 'view-details', row: allowedRow });
      expect(component.selectedRow()).toBe(allowedRow);
      component.registrationDetails();
      expect(mockFacade.buildRegistrationDetails).toHaveBeenCalledWith('prop-123', allowedRow);

      component.closeDetails();
      expect(component.selectedRow()).toBeNull();
    });

    it('el modal descarga el documento elegido del registro abierto', () => {
      const allowedRow = { ...mockRow, allowedActions: ['view-details'] } as DocumentTableRow;
      component.handleTableAction({ action: 'view-details', row: allowedRow });
      component.downloadRegistrationDocument('Carta de aceptación');
      expect(mockFacade.downloadRegistrationDocument).toHaveBeenCalledWith('Carta de aceptación', allowedRow);
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
      component.uploadState.set(null);
      component.confirmUpload();
      expect(mockFacade.upload).not.toHaveBeenCalled();
    });

    it('confirmUpload debería llamar al facade y manejar el callback onSuccess correctamente', () => {
      component.uploadState.set(mockFileData);
      component.confirmModalOpen.set(true);
      mockFacade.upload.mockImplementation((id, fileData, onSuccess, onError) => {
        onSuccess();
        return Promise.resolve();
      });
      component.confirmUpload();
      expect(mockFacade.upload).toHaveBeenCalledWith(
        'prop-123',
        mockFileData,
        expect.any(Function),
        expect.any(Function),
        null
      );
      expect(component.confirmModalOpen()).toBe(false);
      expect(component.uploadState()).toBeNull();
    });
  });

  describe('Práctica profesional: la corrección lleva una nueva carta de aceptación', () => {
    const formatoA = { fileName: 'formato-a.pdf', file: new File([], 'formato-a.pdf') };
    const carta = { fileName: 'carta.pdf', file: new File([], 'carta.pdf') };

    beforeEach(() => {
      mockFacade.requiresAcceptanceLetter.mockReturnValue(true);
      // El valor depende del id de la propuesta: se recalcula con uno distinto
      component.proposalId.set('prop-pp');
    });

    it('después del formato A pide la carta y envía las dos al confirmar', () => {
      component.onFileSelected(formatoA);
      expect(component.letterModalOpen()).toBe(true);
      expect(component.confirmModalOpen()).toBe(false);

      component.onLetterSelected(carta);
      expect(component.confirmModalOpen()).toBe(true);
      expect(component.confirmDescription()).toContain('nueva carta de aceptación');

      component.confirmUpload();
      expect(mockFacade.upload).toHaveBeenCalledWith('prop-pp', formatoA, expect.any(Function), expect.any(Function),
        carta.file);
    });

    it('si se cierra sin elegir la carta, no se carga la corrección y avisa', () => {
      component.onFileSelected(formatoA);
      component.closeLetterModal();

      expect(component.uploadState()).toBeNull();
      expect(component.confirmModalOpen()).toBe(false);
      expect(mockFacade.showAcceptanceLetterRequiredNotification).toHaveBeenCalled();
    });
  });

  describe('Navegación', () => {
    it('goBack debería navegar un nivel arriba en la ruta', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
    });
  });
});
