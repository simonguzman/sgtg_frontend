import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { StatisticsFilters } from '../interfaces/statisticsFilters.enum';
import { RawProjectData } from '../interfaces/rawProjectData.enum';

@Injectable({
  providedIn: 'root'
})
export class StatisticsReportService {

  public downloadPdfReport(
    filters: StatisticsFilters,
    data: RawProjectData[],
    kpis: { loaded: number, approved: number, obs: number, rejected: number }
  ): void {

    // 1. Inicializar el documento (Orientación portrait, unidad milímetros, tamaño A4)
    const doc = new jsPDF('p', 'mm', 'a4');

    // 2. Título principal
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Reporte de Control Académico', 14, 20);

    // 3. Fecha de generación
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    const dateStr = new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'full', timeStyle: 'short'
    }).format(new Date());
    doc.text(`Generado el: ${dateStr}`, 14, 28);

    // 4. Sección de Filtros Aplicados
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Filtros Aplicados:', 14, 40);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105); // slate-600
    const filterStage = filters.stage ? filters.stage : 'Todas las etapas';
    const filterPeriod = filters.period ? filters.period : 'Todos los periodos';
    const filterDirector = filters.directorId ? 'Director Específico' : 'Todos los directores';
    doc.text(`• Etapa: ${filterStage}`, 14, 48);
    doc.text(`• Periodo: ${filterPeriod}`, 14, 54);
    doc.text(`• Director: ${filterDirector}`, 14, 60);

    // 5. Sección de Resumen (KPIs)
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text('Resumen de Métricas:', 100, 40);

    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Proyectos Totales: ${kpis.loaded}`, 100, 48);
    doc.text(`• Aprobados: ${kpis.approved}`, 100, 54);
    doc.text(`• Aprobados c/Obs: ${kpis.obs}`, 100, 60);
    doc.text(`• No Aprobados/Cancelados: ${kpis.rejected}`, 100, 66);

    // 6. Tabla de Datos
    // Preparamos las filas extrayendo solo lo necesario del estado actual
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
      headStyles: { fillColor: [14, 165, 233] }, // Color primario (ajusta a tu gusto)
      styles: { fontSize: 8, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 60 } // Le damos más espacio al título
      }
    });

    // 7. Descargar el archivo
    const fileName = `Reporte_Academico_${new Date().getTime()}.pdf`;
    doc.save(fileName);
  }
}
