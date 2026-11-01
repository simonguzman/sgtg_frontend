import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { StatisticsReportFormat } from '../../services/statistics-reports.service';

/** Formato que se puede elegir, con su botón y lo que trae el archivo */
interface ReportFormatOption {
  format: StatisticsReportFormat;
  label: string;
  icon: string;
  description: string;
}

export const REPORT_FORMAT_OPTIONS: readonly ReportFormatOption[] = [
  { format: 'pdf', label: 'PDF', icon: 'picture_as_pdf',
    description: 'Para imprimir o compartir: alcance, filtros, métricas y la tabla de trabajos.' },
  { format: 'excel', label: 'Excel', icon: 'table_view',
    description: 'Para analizar los datos: hoja "Trabajos" con la tabla y hoja "Resumen" con los filtros y las métricas.' },
  { format: 'csv', label: 'CSV', icon: 'description',
    description: 'Para llevar los datos a otra herramienta: solo la tabla de trabajos, separada por punto y coma.' }
];

/**
 * Confirmación del reporte de estadísticas: muestra cuántos trabajos lleva y
 * deja elegir el formato en que se descarga.
 */
@Component({
  selector: 'app-report-format-modal',
  imports: [DialogModule, ButtonComponent],
  templateUrl: './report-format-modal.component.html'
})
export class ReportFormatModalComponent implements OnChanges {

  @Input() isOpen = false;
  /** Trabajos que lleva el reporte (los que dejan los filtros) */
  @Input() rows = 0;

  @Output() onClose = new EventEmitter<void>();
  @Output() selectFormat = new EventEmitter<StatisticsReportFormat>();

  readonly options = REPORT_FORMAT_OPTIONS;

  /** Ya se eligió un formato en esta apertura: un doble clic no descarga dos veces */
  selected = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) this.selected = false;
  }

  get description(): string {
    if (this.rows === 0) return 'Con los filtros actuales no hay trabajos: el reporte saldrá sin filas.';
    return `Se generará el reporte con ${this.rows === 1 ? 'el trabajo' : `los ${this.rows} trabajos`} que dejan los filtros actuales. Elige el formato en que quieres descargarlo:`;
  }

  closeModal(): void {
    this.onClose.emit();
  }

  choose(format: StatisticsReportFormat): void {
    if (this.selected) return;
    this.selected = true;
    this.selectFormat.emit(format);
    this.closeModal();
  }
}
