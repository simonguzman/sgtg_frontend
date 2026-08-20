import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsReportKpis } from '../interfaces/statisticsReportKpis.interface';

const PDF_COLORS = {
  heading: [15, 23, 42] as [number, number, number],    // slate-900
  subtle:  [100, 116, 139] as [number, number, number],  // slate-500
  body:    [71, 85, 105] as [number, number, number],    // slate-600
  tableHeader: [14, 165, 233] as [number, number, number]
};

@Injectable({ providedIn: 'root' })
export class StatisticsReportService {

  // ← kpis: {...} inline → StatisticsReportKpis nombrada
  public downloadPdfReport(
    filters: StatisticsFilters,
    data: RawProjectData[],
    kpis: StatisticsReportKpis
  ): void {
    const doc = new jsPDF('p', 'mm', 'a4');

    // ← Un método único de ~80 líneas dividido en 4 pasos con nombre
    // propio — mismo criterio de "un paso, una responsabilidad" aplicado
    // en ThesisWorkDetailsModalResolverService y los builders de bandeja.
    this.addHeader(doc);
    this.addFiltersSection(doc, filters);
    this.addKpiSection(doc, kpis);
    this.addDataTable(doc, data);

    doc.save(`Reporte_Academico_${new Date().getTime()}.pdf`);
  }

  private addHeader(doc: jsPDF): void {
    doc.setFontSize(18);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Reporte de Control Académico', 14, 20);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.subtle);
    const dateStr = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date());
    doc.text(`Generado el: ${dateStr}`, 14, 28);
  }

  private addFiltersSection(doc: jsPDF, filters: StatisticsFilters): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Filtros Aplicados:', 14, 40);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);

    const filterStage    = filters.stage ? filters.stage : 'Todas las etapas';
    const filterPeriod   = filters.period ? filters.period : 'Todos los periodos';
    const filterDirector = filters.directorId ? 'Director Específico' : 'Todos los directores';
    const filterArchive  = filters.archiveStatus === 'ACTIVE'   ? 'Proyectos Activos' :
                            filters.archiveStatus === 'ARCHIVED' ? 'Historial (Archivados)' : 'Todos';

    doc.text(`• Etapa: ${filterStage}`, 14, 48);
    doc.text(`• Periodo: ${filterPeriod}`, 14, 54);
    doc.text(`• Director: ${filterDirector}`, 14, 60);
    doc.text(`• Registros: ${filterArchive}`, 14, 66);
  }

  private addKpiSection(doc: jsPDF, kpis: StatisticsReportKpis): void {
    doc.setFontSize(12);
    doc.setTextColor(...PDF_COLORS.heading);
    doc.text('Resumen de Métricas:', 100, 40);

    doc.setFontSize(10);
    doc.setTextColor(...PDF_COLORS.body);
    doc.text(`• Proyectos Totales: ${kpis.loaded}`, 100, 48);
    doc.text(`• Aprobados: ${kpis.approved}`, 100, 54);
    doc.text(`• Aprobados c/Obs: ${kpis.obs}`, 100, 60);
    doc.text(`• No Aprobados/Cancelados: ${kpis.rejected}`, 100, 66);
  }

  private addDataTable(doc: jsPDF, data: RawProjectData[]): void {
    const tableRows = data.map((project, index) => [
      (index + 1).toString(),
      project.title,
      project.stage,
      project.status,
      project.directorName,
      project.period
    ]);

    autoTable(doc, {
      startY: 75,
      head: [['#', 'Título del Proyecto', 'Etapa', 'Estado', 'Director', 'Periodo']],
      body: tableRows,
      theme: 'grid',
      headStyles: { fillColor: PDF_COLORS.tableHeader },
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: { 0: { cellWidth: 10 }, 1: { cellWidth: 60 } }
    });
  }
}
