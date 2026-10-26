import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
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

const stageLabel = (stage: string) => STAGE_OPTIONS.find(option => option.value === stage)?.label ?? stage;

@Injectable({ providedIn: 'root' })
export class StatisticsReportService {

  public downloadPdfReport(
    filters: StatisticsFilters,
    data: RawProjectData[],
    kpis: StatisticsReportKpis,
    context: StatisticsReportContext
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');

    this.addHeader(doc, context.scope);
    this.addFiltersSection(doc, filters, context.directorName);
    this.addKpiSection(doc, kpis);
    this.addDataTable(doc, data);

    doc.save(`Reporte_Academico_${new Date().getTime()}.pdf`);
  }

  private addHeader(doc: jsPDF, scope: string): void {
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Reporte de Control Académico', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.subtle);
    const dateStr = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date());
    doc.text(`Generado el: ${dateStr}`, 14, 28);
    doc.text(doc.splitTextToSize(`Alcance: ${scope}`, 180), 14, 34);
  }

  private addFiltersSection(doc: jsPDF, filters: StatisticsFilters, directorName: string | null): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Filtros Aplicados:', 14, 46);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);

    const lines = [
      `• Etapa: ${filters.stage ? stageLabel(filters.stage) : 'Todas las etapas'}`,
      `• Periodo: ${filters.period || 'Todos los periodos'}`,
      `• Director: ${filters.directorId ? directorName ?? 'Director específico' : 'Todos los directores'}`,
      `• Modalidad: ${filters.modality || 'Todas las modalidades'}`,
      `• Programa: ${filters.program || 'Todos los programas'}`,
      `• Registros: ${ARCHIVE_STATUS_OPTIONS.find(option => option.value === filters.archiveStatus)?.label ?? 'Todos'}`,
      `• Plazo: ${DEADLINE_FILTER_OPTIONS.find(option => option.value === filters.deadlineFilter)?.label ?? 'Todos los plazos'}`
    ];
    lines.forEach((line, i) => doc.text(line, 14, 54 + i * 6));
  }

  private addKpiSection(doc: jsPDF, kpis: StatisticsReportKpis): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Resumen de Métricas:', 110, 46);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);
    doc.text(`• Trabajos registrados: ${kpis.loaded}`, 110, 54);
    doc.text(`• En proceso: ${kpis.inProgress}`, 110, 60);
    doc.text(`• Aprobados: ${kpis.approved}`, 110, 66);
    doc.text(`• No aprobados o cancelados: ${kpis.rejected}`, 110, 72);
  }

  private addDataTable(doc: jsPDF, data: RawProjectData[]): void {
    const tableRows = data.map((project, index) => [
      (index + 1).toString(),
      project.title,
      project.modality,
      project.program,
      stageLabel(project.stage),
      STATUS_LABELS[project.status] ?? project.status,
      project.directorName,
      project.period
    ]);

    autoTable(doc, {
      startY: 98,
      head: [['#', 'Título del trabajo', 'Modalidad', 'Programa', 'Etapa', 'Estado', 'Director', 'Periodo']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.tableHeader },
      styles: { fontSize: 7, cellPadding: 2 },
      columnStyles: { 0: { cellWidth: 8 }, 1: { cellWidth: 45 } }
    });
  }
}
