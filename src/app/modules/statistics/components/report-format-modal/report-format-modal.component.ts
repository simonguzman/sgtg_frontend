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

/** Los mismos formatos para el reporte de los trabajos próximos a vencer */
export const DUE_SOON_REPORT_FORMAT_OPTIONS: readonly ReportFormatOption[] = [
  { format: 'pdf', label: 'PDF', icon: 'picture_as_pdf',
    description: 'Para imprimir o compartir: alcance, filtros, resumen y la tabla con la fecha máxima de entrega y los días restantes.' },
  { format: 'excel', label: 'Excel', icon: 'table_view',
    description: 'Para analizar los datos: hoja "Próximos a vencer" con la tabla y hoja "Resumen" con los filtros y los totales.' },
  { format: 'csv', label: 'CSV', icon: 'description',
    description: 'Para llevar los datos a otra herramienta: solo la tabla, separada por punto y coma.' }
];

/** Qué reporte se genera: el de los filtros o el de los trabajos próximos a vencer */
export type ReportKind = 'statistics' | 'dueSoon';

/**
 * Confirmación del reporte de estadísticas: muestra cuántos trabajos lleva y
 * deja elegir el formato en que se descarga. Sirve también para el reporte de
 * los trabajos próximos a vencer ({@link kind}).
 */
@Component({
  selector: 'app-report-format-modal',
  imports: [DialogModule, ButtonComponent],
  templateUrl: './report-format-modal.component.html'
})
export class ReportFormatModalComponent implements OnChanges {

  /**
   * Si la ventana está abierta. El p-dialog se crea la primera vez que se abre ({@link yaSeAbrio}): las
   * páginas tienen varias ventanas que casi nunca se abren y crearlas todas al cargar hacía más lenta la página.
   */
  @Input() set isOpen(valor: boolean) {
    this._isOpen = valor;
    if (valor) this.yaSeAbrio = true;
  }
  get isOpen(): boolean {
    return this._isOpen;
  }
  private _isOpen = false;
  /** Se abrió al menos una vez: desde entonces el p-dialog existe (y se conserva para la animación de cierre). */
  yaSeAbrio = false;
  /** Trabajos que lleva el reporte (los que dejan los filtros) */
  @Input() rows = 0;
  /** Reporte que se genera */
  @Input() kind: ReportKind = 'statistics';

  @Output() onClose = new EventEmitter<void>();
  @Output() selectFormat = new EventEmitter<StatisticsReportFormat>();

  get options(): readonly ReportFormatOption[] {
    return this.kind === 'dueSoon' ? DUE_SOON_REPORT_FORMAT_OPTIONS : REPORT_FORMAT_OPTIONS;
  }

  get title(): string {
    return this.kind === 'dueSoon' ? 'Generar reporte de próximos a vencer' : 'Generar reporte';
  }

  /** Ya se eligió un formato en esta apertura: un doble clic no descarga dos veces */
  selected = false;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) this.selected = false;
  }

  get description(): string {
    if (this.kind === 'dueSoon') {
      const trabajos = this.rows === 1
        ? 'el trabajo de grado próximo a vencer'
        : 'los ' + this.rows + ' trabajos de grado próximos a vencer';
      return 'Se generará el reporte con ' + trabajos
        + ' (entrega en 30 días o menos). Elige el formato en que quieres descargarlo:';
    }
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
