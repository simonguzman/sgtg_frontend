// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

// 2. Componente a probar
import { ThesisWorkPageComponent } from './thesis-work-page.component';

// 3. Servicios, Modelos y Enums
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { ThesisWorkTableRow } from './models/thesis-work-page.model';
import { stateList } from '../../../../core/enums/state.enum';

// Importaciones Basekit para Override y Tipado
import { TableButton, TableComponent, Column } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ────────────────────

interface MockThesisWorkPageFacadeService {
  tableData: WritableSignal<ThesisWorkTableRow[]>;
  headerButtons: WritableSignal<TableButton[]>;
  showRestrictedAccessNotification: jest.Mock<void, []>;
  reactivateThesis: jest.Mock<void, [string, () => void, () => void]>;
}

interface MockRouter {
  // FIX: Reemplazado [any[]] por [(string | number)[]] para tipado estricto de rutas
  navigate: jest.Mock<Promise<boolean>, [(string | number)[]]>;
}

// ── Mocks de Componentes Standalone (Strict-Init) ───────────────────────────

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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkPageComponent', () => {
  let component: ThesisWorkPageComponent;
  let fixture: ComponentFixture<ThesisWorkPageComponent>;

  // Mocks fuertemente tipados
  let facadeMock: MockThesisWorkPageFacadeService;
  let routerMock: MockRouter;

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Inicialización de mocks usando Signals reales y respetando las firmas estrictas
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
    // Reemplazamos los componentes reales de UI por los Mocks aislados
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
    jest.clearAllMocks(); // Prevenir fugas de estado entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola
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
      // Arrange
      mockRow.allowedActions = ['ver']; // Restringimos las acciones permitidas

      // Act
      component.handleTableAction({ action: 'editar', row: mockRow });

      // Assert
      expect(facadeMock.showRestrictedAccessNotification).toHaveBeenCalledTimes(1);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('debe abrir el modal de descripción y cargar los datos', () => {
      // Act
      component.handleTableAction({ action: 'ver descripción', row: mockRow });

      // Assert
      expect(component.descriptionModal().show).toBe(true);
      expect(component.descriptionModal().content).toBe('Descripción detallada');
      expect(component.descriptionModal().title).toBe('Descripción del trabajo de grado');
    });

    it('debe navegar a los detalles al ejecutar "ver"', () => {
      // Act
      component.handleTableAction({ action: 'ver', row: mockRow });

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/details', 'tw-1']);
    });

    it('debe navegar al formulario de edición al ejecutar "editar"', () => {
      // Act
      component.handleTableAction({ action: 'editar', row: mockRow });

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/edit', 'tw-1']);
    });

    it('debe preparar el estado para reactivación al ejecutar "reactivar"', () => {
      // Act
      component.handleTableAction({ action: 'reactivar', row: mockRow });

      // Assert
      expect(component.reactivateState().show).toBe(true);
      expect(component.reactivateState().id).toBe('tw-1');
      expect(component.reactivateState().loading).toBe(false);
    });
  });

  describe('Botones de Encabezado (handleHeaderButton)', () => {
    it('debe navegar a la vista de formatos cuando se hace clic en "Formatos descargables"', () => {
      // Arrange (Sin casteos: construimos un objeto que cumple la interfaz)
      const mockButton: TableButton = { label: 'Formatos descargables', variant: 'primary' };

      // Act
      component.handleHeaderButton(mockButton);

      // Assert
      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/downloadable_formats']);
    });

    it('no debe hacer nada si la etiqueta del botón no coincide', () => {
      // Arrange
      const mockButton: TableButton = { label: 'Otro Botón', variant: 'secondary' };

      // Act
      component.handleHeaderButton(mockButton);

      // Assert
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });

  describe('Flujo de Reactivación (confirmReactivation & cancelReactivation)', () => {
    it('debe cancelar la reactivación y limpiar el estado por completo', () => {
      // Arrange
      component.reactivateState.set({ show: true, id: 'tw-1', loading: true });

      // Act
      component.cancelReactivation();

      // Assert
      expect(component.reactivateState()).toEqual({ show: false, id: null, loading: false });
    });

    it('debe retornar tempranamente si no hay ID o si ya está en estado de carga', () => {
      // Arrange 1: ID null
      component.reactivateState.set({ show: true, id: null, loading: false });

      // Act 1
      component.confirmReactivation();

      // Assert 1
      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();

      // Arrange 2: Ya está cargando
      component.reactivateState.set({ show: true, id: 'tw-1', loading: true });

      // Act 2
      component.confirmReactivation();

      // Assert 2
      expect(facadeMock.reactivateThesis).not.toHaveBeenCalled();
    });

    it('debe llamar al facade y manejar el estado de carga y cierre tras un ÉXITO (onSuccess)', () => {
      // Arrange
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess) => onSuccess());

      // Act
      component.confirmReactivation();

      // Assert
      expect(facadeMock.reactivateThesis).toHaveBeenCalledWith('tw-1', expect.any(Function), expect.any(Function));
      // Al ser exitoso, el modal debe cerrarse y resetear valores
      expect(component.reactivateState()).toEqual({ show: false, id: null, loading: false });
    });

    it('debe llamar al facade y restablecer el estado de carga (manteniendo el modal abierto) tras un ERROR (onError)', () => {
      // Arrange
      component.reactivateState.set({ show: true, id: 'tw-1', loading: false });
      facadeMock.reactivateThesis.mockImplementation((id, onSuccess, onError) => onError());

      // Act
      component.confirmReactivation();

      // Assert
      // El modal debe seguir abierto (show: true) y conservar el ID, pero detener la barra de carga
      expect(component.reactivateState()).toEqual({ show: true, id: 'tw-1', loading: false });
    });
  });
});
