import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Column, TableComponent } from './table-component.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';

const COLUMNS_TEXT: Column[] = [
  { field: 'nombre', header: 'Nombre', type: 'text', width: '50%' },
  { field: 'correo', header: 'Correo', type: 'text', width: '50%' },
];

const COLUMS_STATE: Column[] = [
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

const ROWS = [
  { nombre: 'Simón Guzmán', correo: 'simonguzman@unicauca.edu.co', estado: 'Aprobado' },
  { nombre: 'Vanessa Agredo', correo: 'vanessaagredo@Unicauca.edu.co', estado: 'En revisión' },
];

async function mountTable(
  columns: Column[],
  value: any[] = ROWS,
  overrides: Partial<TableComponent> = {}
): Promise<{ fixture: ComponentFixture<TableComponent>; component: TableComponent }> {

  const fixture = TestBed.createComponent(TableComponent);
  const component = fixture.componentInstance;

  component.columns = columns;
  component.value = value;
  Object.assign(component, overrides);

  fixture.detectChanges();
  await fixture.whenStable();

  return { fixture, component }
}

describe('TableComponent', () => {
  let component: TableComponent;
  let fixture: ComponentFixture<TableComponent>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [TableComponent],
      providers: [provideNoopAnimations()]
    })
      .compileComponents();
  });

  it('Debe crearse correctamente', async () => {
    const { component } = await mountTable(COLUMNS_TEXT);
    expect(component).toBeTruthy();
  });

  it('Debe renderizar los encabezados definidos en las columnas', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT);
    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers.length).toBe(COLUMNS_TEXT.length);
    expect(headers[0].textContent.trim()).toBe('Nombre');
  });

  it('Debe aplicarse el width definido en las columnas', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT);
    const headers = fixture.nativeElement.querySelectorAll('th');
    expect(headers[0].style.width).toBe('50%');
  });

  it('Debe mostrar el empty state cuando value este vacio', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT, []);
    const emptyState = fixture.debugElement.query(By.css('app-empty-state'));
    expect(emptyState).toBeTruthy();
  });

  it('Debe pasar correctamente el valor al state component', async () => {
    const { fixture } = await mountTable(COLUMS_STATE);
    const states = fixture.debugElement.queryAll(By.css('app-state'));
    expect(states[0].componentInstance.state).toBe('Aprobado');
  });

  it('Debe emitir actionClick con acción y fila correcta', async () => {
    const { fixture, component } = await mountTable(COLUMNS_ACTIONS);
    const spy = jest.fn();
    component.actionClick.subscribe(spy);
    const buttons = fixture.debugElement.queryAll(By.css('td app-button-component'));
    buttons[0].componentInstance.onClick.emit();
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'ver', row: expect.any(Object) })
    );
  });

  it('Debe emitir un evento al click en el botón del encabezado (Header)', async () => {
    const { fixture, component } = await mountTable(COLUMNS_TEXT, ROWS, {
      headerButtons: [{ label: 'Nuevo', variant: 'primary' }]
    });

    const spy = jest.fn();
    component.headerButtonClick.subscribe(spy);

    // Selector actualizado a la estructura de tu nuevo HTML (flex gap-2)
    const btn = fixture.debugElement.query(By.css('.flex.gap-2 app-button-component'));

    expect(btn).not.toBeNull(); // Verificamos que el botón existe antes de emitir
    btn.componentInstance.onClick.emit();

    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Nuevo', variant: 'primary' })
    );
  });

  it('Debe llamar a filterGlobal cuando se escribe en el buscador', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT);
    const pTable = fixture.debugElement.query(By.css('p-table')).componentInstance;
    const filterSpy = jest.spyOn(pTable, 'filterGlobal');

    const input = fixture.nativeElement.querySelector('.table-search-input');
    input.value = 'Simón';
    input.dispatchEvent(new Event('input'));

    expect(filterSpy).toHaveBeenCalledWith('Simón', 'contains');
  });

  it('Debe tener configurado el tooltip en las celdas de texto', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT);
    const firstCell = fixture.debugElement.query(By.css('td span'));

    // Obtenemos la instancia de la directiva Tooltip
    const tooltip = firstCell.injector.get(Tooltip);
    expect(tooltip.content).toBe(ROWS[0].nombre);
  });

  it('Debe respetar el input del paginator', async () => {
    const { fixture } = await mountTable(COLUMNS_TEXT, ROWS, {
      paginator: true
    });
    const pTable = fixture.debugElement.query(By.css('p-table'));
    expect(pTable.componentInstance.paginator).toBe(true);
  });
});
