import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Table, TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { CommonModule } from '@angular/common';
import { StateComponent } from '../state/state.component';
import { ButtonComponent } from '../button-component/button-component.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';

export interface TableButton{
  action?: string;
  label?: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
}

export interface ActionButton{
  action: string;
  label?: string;
  icon?: string;
  variant: 'primary' | 'secondary';
  disabled: boolean;
}

export interface Column{
  field: string;
  header: string;
  type?: 'text' | 'state' | 'actions';
  actions?: ActionButton[];
  width ?: string;
  filterable?: boolean;
}

export type TableRow = {
  [key: string]: any;
  allowedActions?: string[];
};

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

  protected Array = Array;

  @Input() value: T[] = [];
  @Input() columns: Column[] = [];
  @Input() rows: number = 5;
  @Input() paginator: boolean = false;
  @Input() headerButtons?: TableButton[];
  @Input() emptyMessage: string = 'No hay datos registrados en el sistema';
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
