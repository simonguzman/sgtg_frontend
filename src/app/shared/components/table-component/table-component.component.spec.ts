import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Column, TableComponent, TableRow } from './table-component.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';

// --- Mocks de Configuración ---
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

// Tipado estricto usando la interfaz exportada por tu componente en lugar de any[]
const ROWS: TableRow[] = [
  { nombre: 'Simón Guzmán', correo: 'simonguzman@unicauca.edu.co', estado: 'Aprobado' },
  { nombre: 'Vanessa Agredo', correo: 'vanessaagredo@unicauca.edu.co', estado: 'En revisión' },
];

// --- Función Auxiliar Moderna ---
async function mountTable(
  columns: Column[],
  value: TableRow[] = ROWS,
  overrides: Partial<TableComponent> = {}
): Promise<{ fixture: ComponentFixture<TableComponent>; component: TableComponent }> {
  const fixture = TestBed.createComponent(TableComponent);
  const component = fixture.componentInstance;

  // Usamos setInput para garantizar que los hooks de Angular (ej. ngOnChanges) se disparen
  fixture.componentRef.setInput('columns', columns);
  fixture.componentRef.setInput('value', value);

  // Aplicar overrides tipados correctamente
  for (const [key, val] of Object.entries(overrides)) {
    fixture.componentRef.setInput(key, val);
  }

  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, component };
}

describe('TableComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [provideNoopAnimations()]
    }).compileComponents();
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
      const emptyState = fixture.debugElement.query(By.css('app-empty-state'));

      expect(emptyState).toBeTruthy();
    });

    it('debería pasar correctamente el valor al componente de estado (app-state)', async () => {
      const { fixture } = await mountTable(COLUMNS_STATE);
      const states = fixture.debugElement.queryAll(By.css('app-state'));

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

      const buttons = fixture.debugElement.queryAll(By.css('td app-button-component'));
      buttons[0].componentInstance.onClick.emit();

      // Eliminamos el expect.any(Object) y comprobamos la referencia estricta de la fila mock
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ver', row: ROWS[0] })
      );
    });

    it('debería emitir headerButtonClick al hacer clic en un botón del encabezado', async () => {
      const headerBtnMock = { label: 'Nuevo', variant: 'primary' as const };
      const { fixture, component } = await mountTable(COLUMNS_TEXT, ROWS, {
        headerButtons: [headerBtnMock]
      });

      const spy = jest.spyOn(component.headerButtonClick, 'emit');
      const btn = fixture.debugElement.query(By.css('.flex.gap-2 app-button-component'));

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
