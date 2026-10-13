import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';
import { ThesisWorkPageComponent } from './thesis-work-page.component';
import { ThesisWorkPageFacadeService } from './services/thesis-work-page-facade.service';
import { ThesisWorkTableRow } from './models/thesis-work-page.model';
import { stateList } from '../../../../core/enums/state.enum';
import { TableButton, TableComponent, Column } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';

interface MockThesisWorkPageFacadeService {
  tableData: WritableSignal<ThesisWorkTableRow[]>;
  headerButtons: WritableSignal<TableButton[]>;
  showRestrictedAccessNotification: jest.Mock<void, []>;
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
      showRestrictedAccessNotification: jest.fn()
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
      remove: { imports: [TableComponent, DescriptionModalComponent] },
      add: { imports: [MockTableComponent, MockDescriptionModalComponent] }
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

    it('"reactivar" lleva al director al registro de la reanudación del trabajo', () => {
      component.handleTableAction({ action: 'reactivar', row: mockRow });

      expect(routerMock.navigate).toHaveBeenCalledWith(['/thesis-work/details', 'tw-1', 'register_special_request']);
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

});
