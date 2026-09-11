import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

import { Column, TableButton, TableComponent, TableRow } from './table-component.component';

// ── Componentes Originales a Remover (Shallow Testing) ───────────────────────
import { ButtonComponent } from '../button-component/button-component.component';
import { StateComponent } from '../state/state.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label?: string;
  @Input() icon?: string;
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-state', standalone: true, template: '' })
class MockStateComponent {
  @Input() label?: string;
  @Input() state?: string;
}

@Component({ selector: 'app-empty-state', standalone: true, template: '' })
class MockEmptyStateComponent {
  @Input() message = '';
}

// ── Mocks de Configuración ──────────────────────────────────────────────────

const COLUMNS_TEXT: Column[] = [
  { field: 'nombre', header: 'Nombre', type: 'text', width: '50%' },
  { field: 'correo', header: 'Correo', type: 'text', width: '50%' },
];

const COLUMNS_STATE: Column[] = [
  { field: 'nombre', header: 'Nombre', type: 'text' },
  { field: 'estado', header: 'Estado', type: 'state' },
];

const COLUMNS_ACTIONS: Column[] = [
  { field: 'nombre', header: 'Nombre', type: 'text' },
  {
    field: 'acciones',
    header: 'Acciones',
    type: 'actions',
    actions: [
      { action: 'ver', icon: 'visibility', variant: 'primary', disabled: true },
      { action: 'eliminar', icon: 'delete', variant: 'primary', disabled: true },
    ],
  },
];

const ROWS: TableRow[] = [
  { nombre: 'Simón Guzmán', correo: 'simonguzman@unicauca.edu.co', estado: 'Aprobado' },
  { nombre: 'Vanessa Agredo', correo: 'vanessaagredo@unicauca.edu.co', estado: 'En revisión' },
];

// ── Función Auxiliar Moderna ────────────────────────────────────────────────

async function mountTable(
  columns: Column[],
  value: TableRow[] = ROWS,
  overrides: Partial<TableComponent> = {}
): Promise<{ fixture: ComponentFixture<TableComponent>; component: TableComponent }> {
  const fixture = TestBed.createComponent(TableComponent);
  const component = fixture.componentInstance;

  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('value', value);

  for (const [key, val] of Object.entries(overrides)) {
    fixture.componentRef.setInput(key, val);
  }

  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, component };
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('TableComponent', () => {
  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [provideNoopAnimations()]
    })
    .overrideComponent(TableComponent, {
      remove: {
        imports: [ButtonComponent, StateComponent, EmptyStateComponent]
      },
      add: {
        imports: [MockButtonComponent, MockStateComponent, MockEmptyStateComponent]
      }
    })
    .compileComponents();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Renderizado e Inicialización', () => {
    it('debería crearse correctamente', async () => {
      const { component } = await mountTable(COLUMNS_TEXT);
      expect(component).toBeTruthy();
    });

    it('debería renderizar los encabezados definidos en las columnas', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT);
      const headers = fixture.nativeElement.querySelectorAll('th');

      expect(headers).toHaveLength(COLUMNS_TEXT.length);
      expect(headers[0].textContent.trim()).toBe('Nombre');
      expect(headers[1].textContent.trim()).toBe('Correo');
    });

    it('debería aplicar el width definido en las columnas', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT);
      const headers = fixture.nativeElement.querySelectorAll('th');

      expect(headers[0].style.width).toBe('50%');
    });

    it('debería respetar el input del paginator', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT, ROWS, { paginator: true });
      const pTable = fixture.debugElement.query(By.css('p-table'));

      expect(pTable.componentInstance.paginator).toBe(true);
    });
  });

  describe('Estados Especiales de las Columnas', () => {
    it('debería mostrar el empty state cuando el value esté vacío', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT, []);
      // Al usar el Mock, buscamos por la directiva en lugar de la clase o selector CSS
      const emptyState = fixture.debugElement.query(By.directive(MockEmptyStateComponent));

      expect(emptyState).toBeTruthy();
    });

    it('debería pasar correctamente el valor al componente de estado (app-state)', async () => {
      const { fixture } = await mountTable(COLUMNS_STATE);
      const states = fixture.debugElement.queryAll(By.directive(MockStateComponent));

      expect(states.length).toBeGreaterThan(0);
      expect(states[0].componentInstance.state).toBe('Aprobado');
    });

    it('debería tener configurado el tooltip de PrimeNG en las celdas de texto', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT);
      const firstCell = fixture.debugElement.query(By.css('td span'));

      const tooltip = firstCell.injector.get(Tooltip);
      expect(tooltip.content).toBe(ROWS[0]['nombre']);
    });
  });

  describe('Interacciones y Emisión de Eventos', () => {
    it('debería emitir actionClick con la acción y la fila tipada correcta', async () => {
      const { fixture, component } = await mountTable(COLUMNS_ACTIONS);
      const spy = jest.spyOn(component.actionClick, 'emit');

      // Buscamos directamente la instancia del componente simulado
      const buttons = fixture.debugElement.queryAll(By.directive(MockButtonComponent));
      buttons[0].componentInstance.onClick.emit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ver', row: ROWS[0] })
      );
    });

    it('debería emitir headerButtonClick al hacer clic en un botón del encabezado', async () => {
      // Tipado estricto
      const headerBtnMock: TableButton = { label: 'Nuevo', variant: 'primary' };

      const { fixture, component } = await mountTable(COLUMNS_TEXT, ROWS, {
        headerButtons: [headerBtnMock]
      });

      const spy = jest.spyOn(component.headerButtonClick, 'emit');

      // Buscamos el MockButtonComponent y simulamos el output
      const btn = fixture.debugElement.query(By.directive(MockButtonComponent));
      expect(btn).not.toBeNull();

      btn.componentInstance.onClick.emit();

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining(headerBtnMock)
      );
    });

    it('debería delegar el evento al método globalFilter de la tabla al escribir en el buscador', async () => {
      const { fixture } = await mountTable(COLUMNS_TEXT);
      const pTable = fixture.debugElement.query(By.css('p-table')).componentInstance;
      const filterSpy = jest.spyOn(pTable, 'filterGlobal');

      const input = fixture.nativeElement.querySelector('.table-search-input');
      input.value = 'Simón';
      input.dispatchEvent(new Event('input'));

      expect(filterSpy).toHaveBeenCalledWith('Simón', 'contains');
    });
  });
});
