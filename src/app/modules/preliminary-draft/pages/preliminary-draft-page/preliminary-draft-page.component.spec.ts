import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PreliminaryDraftPageComponent } from './preliminary-draft-page.component';
import { PreliminaryDraftFacadeService } from './services/preliminary-draft-facade.service';
import { PreliminaryDraftTableRow } from './models/preliminary-draft-page.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

describe('PreliminaryDraftPageComponent', () => {
  let component: PreliminaryDraftPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftPageComponent>;

  // Reemplazamos los 'any' definiendo la estructura exacta de los mocks
  let mockRouter: { navigate: jest.Mock };
  let mockFacade: {
    tableData: jest.Mock;
    headerButtons: jest.Mock;
    showRestrictedAccessNotification: jest.Mock;
    deleteDraft: jest.Mock;
  };

  beforeEach(async () => {
    mockRouter = {
      navigate: jest.fn()
    };

    mockFacade = {
      tableData: jest.fn().mockReturnValue([]),
      headerButtons: jest.fn().mockReturnValue([]),
      showRestrictedAccessNotification: jest.fn(),
      deleteDraft: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: PreliminaryDraftFacadeService, useValue: mockFacade }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Interacción con la Tabla (handleTableAction)', () => {
    const mockRow: PreliminaryDraftTableRow = {
      id: '1', title: 'Test', modality: '', description: 'Desc', state: '',
      remainingTime: '', hiddenParticipants: '', allowedActions: ['ver', 'editar', 'eliminar', 'ver descripción']
    };

    it('debería denegar acceso si la acción no está permitida', () => {
      const restrictedRow = { ...mockRow, allowedActions: ['ver descripción'] };
      component.handleTableAction({ action: 'editar', row: restrictedRow });

      expect(mockFacade.showRestrictedAccessNotification).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });

    it('debería navegar a detalles en la acción "ver"', () => {
      component.handleTableAction({ action: 'ver', row: mockRow });
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft/details', '1']);
    });

    it('debería abrir el modal de descripción', () => {
      component.handleTableAction({ action: 'ver descripción', row: mockRow });
      expect(component.descriptionModal.show).toBe(true);
      expect(component.descriptionModal.content).toBe('Desc');
    });

    it('debería preparar el estado de eliminación', () => {
      component.handleTableAction({ action: 'eliminar', row: mockRow });
      expect(component.deleteState.show).toBe(true);
      expect(component.deleteState.id).toBe('1');
    });
  });

  describe('Interacción con Botones de Cabecera (handleHeaderButton)', () => {
    it('debería navegar a crear anteproyecto', () => {
      // Solución al error TS(2345): Proveemos la propiedad 'variant' requerida
      const buttonMock: TableButton = { label: 'Registrar anteproyecto', variant: 'primary' };

      component.handleHeaderButton(buttonMock);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft/create']);
    });

    it('debería navegar a formatos descargables', () => {
      // Solución al error TS(2345): Proveemos la propiedad 'variant' requerida
      const buttonMock: TableButton = { label: 'Formatos descargables', variant: 'primary' };

      component.handleHeaderButton(buttonMock);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft/downloadable_formats']);
    });
  });

  describe('Modal de Eliminación', () => {
    it('debería cancelar la eliminación', () => {
      component.deleteState = { show: true, id: '1', title: 'Test', loading: false };
      component.cancelDelete();
      expect(component.deleteState.show).toBe(false);
      expect(component.deleteState.id).toBeNull();
    });

    it('debería confirmar la eliminación llamando a la fachada', () => {
      component.deleteState = { show: true, id: '1', title: 'Test', loading: false };

      component.confirmDelete();

      expect(component.deleteState.loading).toBe(true);
      expect(mockFacade.deleteDraft).toHaveBeenCalledWith('1', expect.any(Function), expect.any(Function));
    });
  });
});
