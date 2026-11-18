import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { StateComponent } from '../state/state.component';
import { ButtonComponent } from '../button-component/button-component.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

/** Botón de la cabecera de la tabla. */
export interface TableButton{
  action?: string;
  label?: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
}

/** Botón de acción de una fila; la fila lo muestra solo si su acción está en `allowedActions`. */
export interface ActionButton{
  action: string;
  label?: string;
  icon?: string;
  /** Texto al pasar el cursor (y nombre accesible); útil en los botones que solo tienen icono */
  tooltip?: string;
  variant: 'primary' | 'secondary';
  disabled: boolean;
}

/** Columna de la tabla: campo de la fila, encabezado y tipo (texto, estado o acciones). */
export interface Column{
  field: string;
  header: string;
  type?: 'text' | 'state' | 'actions';
  actions?: ActionButton[];
  width ?: string;
  filterable?: boolean;
}

/** Fila de la tabla. `allowedActions` indica qué botones de acción se muestran en ella. */
export interface TableRow {
  // any: las páginas pasan filas con su propia interfaz y con unknown ninguna encajaría en la tabla.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
  allowedActions?: string[];
}

/**
 * Tabla de PrimeNG con paginación, filtros por columna, estados y botones de acción por fila. Emite la acción
 * pulsada junto con su fila.
 */
@Component({
  selector: 'app-table-component',
  imports: [
    CommonModule,
    TableModule,
    ButtonComponent,
    StateComponent,
    EmptyStateComponent,
    TooltipModule,
  ],
  templateUrl: './table-component.component.html',
  styleUrl: './table-component.component.css'
})
export class TableComponent<T extends TableRow = TableRow> {
  @Input() value: T[] = [];
  @Input() columns: Column[] = [];
  @Input() rows = 5;
  @Input() paginator = false;
  @Input() headerButtons?: TableButton[];
  @Input() emptyMessage = 'No hay datos registrados en el sistema';
  /** Ancho mínimo de la tabla (p. ej. '1400px'); por debajo se desplaza horizontalmente */
  @Input() minWidth?: string;
  @Input() filterFields: string[] = [];

  @Output() actionClick = new EventEmitter<{ action: string; row: T }>();
  @Output() headerButtonClick = new EventEmitter<TableButton>();

  get getFilterFields(): string[] {
    return this.filterFields.length > 0
      ? this.filterFields
      : this.columns.map(col => col.field);
  }

  onSearch(event: Event, table: Table): void {
    const input = event.target as HTMLInputElement;
    table.filterGlobal(input.value, 'contains');
  }
}
