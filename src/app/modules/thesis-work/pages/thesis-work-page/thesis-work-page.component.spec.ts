import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

import { ThesisWorkPageComponent } from './thesis-work-page.component';
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { ThesisWorkTableRow } from './models/thesis-work-page.model';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { stateList } from '../../../../core/enums/state.enum';

// ============================================================================
// DUMMY COMPONENTS (Para Shallow Testing estricto sin dependencias UI)
// ============================================================================
@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: unknown;
  @Input() columns: unknown;
  @Input() headerButtons: unknown;
  @Input() paginator: unknown;
  @Input() filterFields: unknown;
  @Input() emptyMessage: unknown;
  @Output() actionClick = new EventEmitter();
  @Output() headerButtonClick = new EventEmitter();
}

@Component({ selector: 'app-description-modal', standalone: true, template: '' })
class MockDescriptionModalComponent {
  @Input() isOpen: unknown;
  @Input() titleDescription: unknown;
  @Input() description: unknown;
  @Output() onClose = new EventEmitter();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen: unknown;
  @Input() description: unknown;
  @Output() onClose = new EventEmitter();
  @Output() confirm = new EventEmitter();
}

// ============================================================================
// SUITE DE PRUEBAS
// ============================================================================
describe('ThesisWorkPageComponent', () => {
  let component: ThesisWorkPageComponent;
  let fixture: ComponentFixture<ThesisWorkPageComponent>;

  // Mocks fuertemente tipados
  let facadeMock: {
    tableData: WritableSignal<ThesisWorkTableRow[]>;
    headerButtons: WritableSignal<TableButton[]>;
    showRestrictedAccessNotification: jest.Mock;
    reactivateThesis: jest.Mock;
  };
  let routerMock: { navigate: jest.Mock };

  beforeEach(async () => {
    // Inicialización de mocks usando Signals reales para emular la reactividad
    facadeMock = {
      tableData: signal([]),
      headerButtons: signal([]),
      showRestrictedAccessNotification: jest.fn(),
      reactivateThesis: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ThesisWorkPageComponent],
      providers: [
        { provide: ThesisWorkPageFacadeService, useValue: facadeMock as Partial<ThesisWorkPageFacadeService> },
        { provide: Router, useValue: routerMock as Partial<Router> }
      ]
    })
    // Reemplazamos los componentes reales de UI por los Dummies
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
  });

  describe('Interacciones con la Tabla (handleTableAction)', () => {
    let mockRow: ThesisWorkTableRow;

    beforeEach(() => {
      // Definimos un Row completo para satisfacer la interfaz de forma estricta
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
      mockRow.allowedActions = ['ver']; // Restringimos las acciones

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
      const mockButton: Partial<TableButton> = { label: 'Formatos descargables' };

      component.handleHeaderButton(mockButton as TableButton);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/downloadable_formats']);
    });

    it('no debe hacer nada si la etiqueta del botón no coincide', () => {
      const mockButton: Partial<TableButton> = { label: 'Otro Botón' };

      component.handleHeaderButton(mockButton as TableButton);

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
      // Caso 1: ID null
      component.reactivateState.set({ show: true, id: null, loading: false });
      component.confirmReactivation();
      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();

      // Caso 2: Ya está cargando
      component.reactivateState.set({ show: true, id: 'tw-1', loading: true });
      component.confirmReactivation();
      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();
    });

    it('debe llamar al facade y manejar el estado de carga y cierre tras un ÉXITO (onSuccess)', () => {
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });

      // Emulamos la ejecución del callback de éxito (segundo parámetro)
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess, onError) => {
        onSuccess();
      });

      component.confirmReactivation();

      expect(facadeMock.reactivateThesis).toHaveBeenCalledWith('tw-1', expect.any(Function), expect.any(Function));

      // Al ser exitoso, el modal debe cerrarse y resetear valores
      expect(component.reactivateState()).toEqual({ show: false, id: null, loading: false });
    });

    it('debe llamar al facade y restablecer el estado de carga (manteniendo el modal abierto) tras un ERROR (onError)', () => {
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });

      // Emulamos la ejecución del callback de error (tercer parámetro)
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess, onError) => {
        onError();
      });

      component.confirmReactivation();

      // El modal debe seguir abierto (show: true) y conservar el ID, pero detener la barra de carga
      expect(component.reactivateState()).toEqual({ show: true, id: 'tw-1', loading: false });
    });
  });
});
