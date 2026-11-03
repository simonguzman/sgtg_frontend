import { Injectable } from '@angular/core';
import type { jsPDF } from 'jspdf';
import type autoTableFn from 'jspdf-autotable';
import { DEADLINE_FILTER_OPTIONS, StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsReportKpis } from '../interfaces/statisticsReportKpis.interface';
import { STAGE_OPTIONS } from '../models/statistics-options.model';
import { STATUS_LABELS } from '../models/statistics-chart.model';
import { ARCHIVE_STATUS_OPTIONS } from '../pages/statistics-page/models/statistics-page.model';

const PDF_COLORS = {
  heading: [15, 23, 42] as [number, number, number],    // slate-900
  subtle:  [100, 116, 139] as [number, number, number],  // slate-500
  body:    [71, 85, 105] as [number, number, number],    // slate-600
  tableHeader: [14, 165, 233] as [number, number, number]
};

/** Datos del reporte que no están en los filtros: qué trabajos cuenta y el nombre del director elegido */
export interface StatisticsReportContext {
  scope: string;
  directorName: string | null;
}

/** Formatos en que se puede descargar el reporte. */
export type StatisticsReportFormat = 'pdf' | 'excel' | 'csv';

const TITLE = 'Reporte de Control Académico';
const TABLE_HEADERS = ['#', 'Título del trabajo', 'Modalidad', 'Programa', 'Etapa', 'Estado', 'Director', 'Periodo'];
/** Ancho de cada columna de la tabla en Excel, en caracteres */
const EXCEL_COLUMN_WIDTHS = [6, 50, 26, 30, 22, 22, 30, 10];
/**
 * Separador del CSV: punto y coma, el que espera Excel con la configuración regional de Colombia (la coma es el
 * separador decimal). Otras herramientas permiten elegirlo al importar.
 */
const CSV_SEPARATOR = ';';
const EXCEL_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const stageLabel = (stage: string) => STAGE_OPTIONS.find(option => option.value === stage)?.label ?? stage;

/**
 * Reporte de la pantalla de estadísticas en PDF, Excel (.xlsx) o CSV. Los tres
 * llevan los mismos trabajos (los que dejan los filtros) con las mismas
 * columnas; el PDF y el Excel además llevan el alcance, los filtros aplicados
 * y el resumen de métricas.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsReportService {

  /** Las librerías del PDF se cargan solo al exportar, como la del Excel. */
  public async downloadPdfReport(
    filters: StatisticsFilters,
    data: RawProjectData[],
    kpis: StatisticsReportKpis,
    context: StatisticsReportContext
  ): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF('p', 'mm', 'a4');

    this.addHeader(doc, context.scope);
    this.addFiltersSection(doc, filters, context.directorName);
    this.addKpiSection(doc, kpis);
    this.addDataTable(doc, data, autoTable);

    doc.save(`${this.fileName()}.pdf`);
  }

  /**
   * Excel con dos hojas: "Trabajos" (la tabla, con el encabezado fijo al
   * desplazarse) y "Resumen" (alcance, filtros y métricas). La librería se
   * carga solo al exportar, para no hacer más pesada la aplicación.
   */
  public async downloadExcelReport(
    filters: StatisticsFilters,
    data: RawProjectData[],
    kpis: StatisticsReportKpis,
    context: StatisticsReportContext
  ): Promise<void> {
    const { default: writeXlsxFile } = await import('write-excel-file/browser');
    const header = TABLE_HEADERS.map(value => ({
      value, fontWeight: 'bold' as const, textColor: '#FFFFFF', backgroundColor: '#0EA5E9'
    }));
    const rows = this.tableRows(data).map(([index, ...rest]) => [Number(index), ...rest]);
    const bold = (value: string) => ({ value, fontWeight: 'bold' as const });
    const summary = [
      [{ value: TITLE, fontWeight: 'bold' as const, fontSize: 14 }, null],
      ['Generado el', this.generatedAt()],
      ['Alcance', context.scope],
      [null, null],
      [bold('Filtros aplicados'), null],
      ...this.filterLines(filters, context.directorName),
      [null, null],
      [bold('Resumen de métricas'), null],
      ...this.kpiLines(kpis).map(([label, value]) => [label, value])
    ];

    const blob = await writeXlsxFile([
      { sheet: 'Trabajos', data: [header, ...rows], columns: EXCEL_COLUMN_WIDTHS.map(width => ({ width })), stickyRowsCount: 1 },
      { sheet: 'Resumen', data: summary, columns: [{ width: 28 }, { width: 70 }] }
    ]).toBlob();
    this.save(new Blob([blob], { type: EXCEL_MIME }), `${this.fileName()}.xlsx`);
  }

  /**
   * CSV con la tabla de trabajos (un CSV no tiene secciones: los filtros y las
   * métricas van en el PDF y el Excel). Lleva BOM para que Excel lea bien las
   * tildes y las eñes.
   */
  public downloadCsvReport(
    _filters: StatisticsFilters,
    data: RawProjectData[],
    _kpis: StatisticsReportKpis,
    _context: StatisticsReportContext
  ): void {
    const lines = [TABLE_HEADERS, ...this.tableRows(data)].map(row => row.map(csvCell).join(CSV_SEPARATOR));
    this.save(new Blob(['﻿' + lines.join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }),
      `${this.fileName()}.csv`);
  }

  // ── Contenido común a los tres formatos ────────────────────────────────────

  private filterLines(filters: StatisticsFilters, directorName: string | null): [string, string][] {
    return [
      ['Etapa', filters.stage ? stageLabel(filters.stage) : 'Todas las etapas'],
      ['Periodo', filters.period || 'Todos los periodos'],
      ['Director', filters.directorId ? directorName ?? 'Director específico' : 'Todos los directores'],
      ['Modalidad', filters.modality || 'Todas las modalidades'],
      ['Programa', filters.program || 'Todos los programas'],
      ['Registros', ARCHIVE_STATUS_OPTIONS.find(option => option.value === filters.archiveStatus)?.label ?? 'Todos'],
      ['Plazo', DEADLINE_FILTER_OPTIONS.find(option => option.value === filters.deadlineFilter)?.label ?? 'Todos los plazos']
    ];
  }

  private kpiLines(kpis: StatisticsReportKpis): [string, number][] {
    return [
      ['Trabajos registrados', kpis.loaded],
      ['En proceso', kpis.inProgress],
      ['Aprobados', kpis.approved],
      ['No aprobados o cancelados', kpis.rejected]
    ];
  }

  private tableRows(data: RawProjectData[]): string[][] {
    return data.map((project, index) => [
      (index + 1).toString(),
      project.title,
      project.modality,
      project.program,
      stageLabel(project.stage),
      STATUS_LABELS[project.status] ?? project.status,
      project.directorName,
      project.period
    ]);
  }

  private generatedAt(): string {
    return new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  }

  private fileName(): string {
    return `Reporte_Academico_${new Date().getTime()}`;
  }

  /** Descarga el archivo en el navegador. */
  private save(blob: Blob, fileName: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    // Se libera cuando el navegador ya tomó el archivo
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── PDF ────────────────────────────────────────────────────────────────────

  private addHeader(doc: jsPDF, scope: string): void {
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text(TITLE, 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.subtle);
    doc.text(`Generado el: ${this.generatedAt()}`, 14, 28);
    doc.text(doc.splitTextToSize(`Alcance: ${scope}`, 180), 14, 34);
  }

  private addFiltersSection(doc: jsPDF, filters: StatisticsFilters, directorName: string | null): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Filtros Aplicados:', 14, 46);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);
    this.filterLines(filters, directorName)
      .forEach(([label, value], i) => doc.text(`• ${label}: ${value}`, 14, 54 + i * 6));
  }

  private addKpiSection(doc: jsPDF, kpis: StatisticsReportKpis): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Resumen de Métricas:', 110, 46);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);
    this.kpiLines(kpis).forEach(([label, value], i) => doc.text(`• ${label}: ${value}`, 110, 54 + i * 6));
  }

  private addDataTable(doc: jsPDF, data: RawProjectData[], autoTable: typeof autoTableFn): void {
    autoTable(doc, {
      startY: 98,
      head: [TABLE_HEADERS],
      body: this.tableRows(data),
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.tableHeader },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 45 } }
    });
  }
}

/**
 * Celda de CSV: entre comillas si tiene el separador, comillas o saltos de
 * línea. Si empieza con = + - @ (o tabulador), se le antepone un apóstrofo
 * para que Excel no la ejecute como fórmula (inyección de fórmulas en CSV).
 */
function csvCell(value: string | null | undefined): string {
  let text = value ?? '';
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return text.includes(CSV_SEPARATOR) || /["\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
