import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { ThesisWorkPageComponent } from './thesis-work-page.component';
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { ThesisWorkTableRow } from './models/thesis-work-page.model';
import { stateList } from '../../../../core/enums/state.enum';
import { TableButton, TableComponent, Column } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

interface MockThesisWorkPageFacadeService {
  tableData: WritableSignal<ThesisWorkTableRow[]>;
  headerButtons: WritableSignal<TableButton[]>;
  showRestrictedAccessNotification: jest.Mock<void, []>;
  reactivateThesis: jest.Mock<void, [string, () => void, () => void]>;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [(string | number)[]]>;
}

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: ThesisWorkTableRow[] = [];
  @Input() columns: Column[] = [];
  @Input() headerButtons: TableButton[] = [];
  @Input() paginator = false;
  @Input() filterFields: string[] = [];
  @Input() emptyMessage = '';
  @Output() actionClick = new EventEmitter<{ action: string; row: ThesisWorkTableRow }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();
}

@Component({ selector: 'app-description-modal', standalone: true, template: '' })
class MockDescriptionModalComponent {
  @Input() isOpen = false;
  @Input() titleDescription = '';
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('ThesisWorkPageComponent', () => {
  let component: ThesisWorkPageComponent;
  let fixture: ComponentFixture<ThesisWorkPageComponent>;

  let facadeMock: MockThesisWorkPageFacadeService;
  let routerMock: MockRouter;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    facadeMock = {
      tableData: signal([]),
      headerButtons: signal([]),
      showRestrictedAccessNotification: jest.fn(),
      reactivateThesis: jest.fn()
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    await TestBed.configureTestingModule({
      imports: [ThesisWorkPageComponent],
      providers: [
        { provide: ThesisWorkPageFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock }
      ]
    })
    .overrideComponent(ThesisWorkPageComponent, {
      remove: { imports: [TableComponent, DescriptionModalComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockTableComponent, MockDescriptionModalComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ThesisWorkPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Interacciones con la Tabla (handleTableAction)', () => {
    let mockRow: ThesisWorkTableRow;

    beforeEach(() => {
      mockRow = {
        id: 'tw-1',
        title: 'Tesis de Prueba',
        modality: 'Investigación',
        description: 'Descripción detallada',
        state: stateList.EN_DESARROLLO,
        maxDeliveryDate: '19/08/2026',
        hiddenParticipants: 'Juan Perez',
        allowedActions: ['ver', 'editar', 'ver descripción', 'reactivar']
      };
    });

    it('debe bloquear la ejecución y notificar si la acción no está permitida en la fila', () => {
      mockRow.allowedActions = ['ver'];

      component.handleTableAction({ action: 'editar', row: mockRow });

      expect(facadeMock.showRestrictedAccessNotification).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe abrir el modal de descripción y cargar los datos', () => {
      component.handleTableAction({ action: 'ver descripción', row: mockRow });

      expect(component.descriptionModal().show).toBe(true);
      expect(component.descriptionModal().content).toBe('Descripción detallada');
      expect(component.descriptionModal().title).toBe('Descripción del trabajo de grado');
    });

    it('debe navegar a los detalles al ejecutar "ver"', () => {
      component.handleTableAction({ action: 'ver', row: mockRow });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/details', 'tw-1']);
    });

    it('debe navegar al formulario de edición al ejecutar "editar"', () => {
      component.handleTableAction({ action: 'editar', row: mockRow });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/edit', 'tw-1']);
    });

    it('debe preparar el estado para reactivación al ejecutar "reactivar"', () => {
      component.handleTableAction({ action: 'reactivar', row: mockRow });

      expect(component.reactivateState().show).toBe(true);
      expect(component.reactivateState().id).toBe('tw-1');
      expect(component.reactivateState().loading).toBe(false);
    });
  });

  describe('Botones de Encabezado (handleHeaderButton)', () => {
    it('debe navegar a la vista de formatos cuando se hace clic en "Formatos descargables"', () => {
      const mockButton: TableButton = { label: 'Formatos descargables', variant: 'primary' };

      component.handleHeaderButton(mockButton);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/downloadable_formats']);
    });

    it('no debe hacer nada si la etiqueta del botón no coincide', () => {
      const mockButton: TableButton = { label: 'Otro Botón', variant: 'secondary' };

      component.handleHeaderButton(mockButton);

      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de Reactivación (confirmReactivation & cancelReactivation)', () => {
    it('debe cancelar la reactivación y limpiar el estado por completo', () => {
      component.reactivateState.set({ show: true, id: 'tw-1', loading: true });

      component.cancelReactivation();

      expect(component.reactivateState()).toEqual({ show: false, id: null, loading: false });
    });

    it('debe retornar tempranamente si no hay ID o si ya está en estado de carga', () => {
      component.reactivateState.set({ show: true, id: null, loading: false });

      component.confirmReactivation();

      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();

      component.reactivateState.set({ show: true, id: 'tw-1', loading: true });

      component.confirmReactivation();

      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();
    });

    it('debe llamar al facade y manejar el estado de carga y cierre tras un ÉXITO (onSuccess)', () => {
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess) => onSuccess());

      component.confirmReactivation();

      expect(facadeMock.reactivateThesis).toHaveBeenCalledWith('tw-1', expect.any(Function), expect.any(Function));
      expect(component.reactivateState()).toEqual({ show: false, id: null, loading: false });
    });

    it('debe llamar al facade y restablecer el estado de carga (manteniendo el modal abierto) tras un ERROR (onError)', () => {
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess, onError) => onError());

      component.confirmReactivation();

      expect(component.reactivateState()).toEqual({ show: true, id: 'tw-1', loading: false });
    });
  });
});
