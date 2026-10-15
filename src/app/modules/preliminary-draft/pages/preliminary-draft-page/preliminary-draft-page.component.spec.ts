import { TestBed, ComponentFixture } from '@angular/core/testing';
import { Router } from '@angular/router';
import { PreliminaryDraftPageComponent } from './preliminary-draft-page.component';
import { PreliminaryDraftFacadeService } from './services/preliminary-draft-facade.service';
import { PreliminaryDraftTableRow } from './models/preliminary-draft-page.model';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

const createMockTableRow = (overrides: Partial<PreliminaryDraftTableRow> = {}): PreliminaryDraftTableRow => ({
  id: '1',
  title: 'Test',
  modality: 'Trabajo de Grado',
  description: 'Desc',
  state: 'EN_REVISION',
  remainingTime: 'Quedan 5 días',
  hiddenParticipants: 'Juan Perez',
  allowedActions: ['ver', 'editar', 'anular', 'ver descripción'],
  ...overrides
});

const createMockTableButton = (overrides: Partial<TableButton> = {}): TableButton => ({
  label: 'Registrar anteproyecto',
  variant: 'primary',
  ...overrides
});

describe('PreliminaryDraftPageComponent', () => {
  let component: PreliminaryDraftPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftPageComponent>;

  let mockRouter: { navigate: jest.Mock };
  let mockFacade: {
    tableData: jest.Mock;
    headerButtons: jest.Mock;
    showRestrictedAccessNotification: jest.Mock;
    annulDraft: jest.Mock;
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouter = {
      navigate: jest.fn()
    };

    mockFacade = {
      tableData: jest.fn().mockReturnValue([]),
      headerButtons: jest.fn().mockReturnValue([]),
      showRestrictedAccessNotification: jest.fn(),
      annulDraft: jest.fn()
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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Interacción con la Tabla (handleTableAction)', () => {
    const mockRow = createMockTableRow();

    it('debería denegar acceso si la acción no está permitida', () => {
      const restrictedRow = createMockTableRow({ allowedActions: ['ver descripción'] });
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

    it('debería abrir el modal de anulación', () => {
      component.handleTableAction({ action: 'anular', row: mockRow });

      expect(component.annulState.show).toBe(true);
      expect(component.annulState.id).toBe('1');
    });
  });

  describe('Interacción con Botones de Cabecera (handleHeaderButton)', () => {
    it('debería navegar a crear anteproyecto', () => {
      const buttonMock = createMockTableButton({ label: 'Registrar anteproyecto' });

      component.handleHeaderButton(buttonMock);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft/create']);
    });

    it('debería navegar a formatos descargables', () => {
      const buttonMock = createMockTableButton({ label: 'Formatos descargables' });

      component.handleHeaderButton(buttonMock);
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/preliminary-draft/downloadable_formats']);
    });
  });

  describe('Modal de anulación', () => {
    it('debería cancelar la anulación limpiando el estado', () => {
      component.annulState = { show: true, id: '1', title: 'Test', loading: false };

      component.cancelAnnul();

      expect(component.annulState.show).toBe(false);
      expect(component.annulState.id).toBeNull();
    });

    it('debería confirmar la anulación llamando a la fachada y gestionar el éxito', () => {
      component.annulState = { show: true, id: '1', title: 'Test', loading: false };

      mockFacade.annulDraft.mockImplementation((id: string, justification: string, onSuccess: () => void) => {
        onSuccess();
      });

      component.confirmAnnul('Motivo');

      expect(mockFacade.annulDraft).toHaveBeenCalledWith('1', 'Motivo', expect.any(Function), expect.any(Function));
      expect(component.annulState.show).toBe(false);
      expect(component.annulState.id).toBeNull();
      expect(component.annulState.loading).toBe(false);
    });

    it('debería gestionar el error restaurando el estado de loading', () => {
      component.annulState = { show: true, id: '1', title: 'Test', loading: false };

      mockFacade.annulDraft.mockImplementation((id: string, justification: string, onSuccess: () => void, onError: () => void) => {
        onError();
      });

      component.confirmAnnul('Motivo');

      expect(component.annulState.loading).toBe(false);
      expect(component.annulState.show).toBe(true);
    });

    it('no debería ejecutar la eliminación si ya está cargando o no hay ID', () => {
      component.annulState = { show: true, id: '1', title: 'Test', loading: true };

      component.confirmAnnul('Motivo');

      expect(mockFacade.annulDraft).not.toHaveBeenCalled();
    });
  });
});
