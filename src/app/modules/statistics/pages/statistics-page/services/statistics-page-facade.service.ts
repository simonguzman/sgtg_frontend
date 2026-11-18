import { computed, inject, Injectable } from '@angular/core';
import { StatisticsStateService } from '../../../services/statistics-state.service';
import { StatisticsMetricsService } from '../../../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../../../services/statistics-chart-data.service';
import { StatisticsReportFormat, StatisticsReportService } from '../../../services/statistics-reports.service';
import { StatisticsFilters } from '../../../interfaces/statisticsFilters.interface';
import { StatisticsReportKpis } from '../../../interfaces/statisticsReportKpis.interface';
import { StatisticsRemindersService } from '../../../services/statistics-reminders.service';
import { RawProjectData } from '../../../interfaces/rawProjectData.interface';

/**
 * Fachada de la página de estadísticas: reúne los filtros, las métricas, los datos de los gráficos, los
 * recordatorios y los reportes.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsPageFacadeService {
  private readonly state = inject(StatisticsStateService);
  private readonly metrics = inject(StatisticsMetricsService);
  private readonly chartData = inject(StatisticsChartDataService);
  private readonly reportService = inject(StatisticsReportService);
  private readonly reminders = inject(StatisticsRemindersService);

  /** Filtros aplicados. */
  readonly currentFilters = this.state.currentFilters;
  /** Opciones del filtro de etapa. */
  readonly stagesOptions = this.state.stagesOptions;
  /** Periodos académicos con trabajos. */
  readonly periodsOptions = this.state.periodsOptions;
  /** Directores con trabajos. */
  readonly directorsOptions = this.state.directorsOptions;
  /** Modalidades con trabajos. */
  readonly modalityOptions = this.state.modalityOptions;
  /** Programas con trabajos. */
  readonly programOptions = this.state.programOptions;
  /** Alcance de las estadísticas según los roles del usuario. */
  readonly scope = this.state.scope;
  /** Trabajos que cumplen los filtros. */
  readonly totalLoaded = this.metrics.totalLoaded;
  /** Trabajos aprobados. */
  readonly totalApproved = this.metrics.totalApproved;
  /** Trabajos en proceso. */
  readonly totalInProgress = this.metrics.totalInProgress;
  /** Trabajos no aprobados o cancelados. */
  readonly totalNotApproved = this.metrics.totalNotApproved;
  /** Trabajos de grado próximos a vencer (a 30 días o menos de la fecha máxima de entrega), del más urgente */
  readonly dueSoonProjects = this.metrics.dueSoonProjects;
  /** Cantidad de trabajos próximos a vencer. */
  readonly totalDueSoon = this.metrics.totalDueSoon;
  /** Quién recuerda la entrega y quién abre el detalle del trabajo */
  readonly canRemind = this.reminders.canRemind;
  /** true si el usuario abre el detalle de los trabajos. */
  readonly canOpenDetails = this.reminders.canOpenDetails;
  /** Trabajos cuyo recordatorio se está enviando. */
  readonly sendingReminder = this.reminders.sending;
  /** Trabajos a los que ya se les envió el recordatorio hoy. */
  readonly remindedToday = this.reminders.reminded;
  /** Datos del gráfico por estado. */
  readonly statusChartData = this.chartData.statusChartData;
  /** Datos del gráfico por etapa. */
  readonly stageChartData = this.chartData.stageChartData;
  /** Datos del gráfico por modalidad. */
  readonly modalityChartData = this.chartData.modalityChartData;
  /** Datos del gráfico por programa. */
  readonly programChartData = this.chartData.programChartData;

  /** Aplica los filtros indicados sobre los actuales. */
  updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.state.updateFilters(newFilters);
  }

  /** Vuelve a los filtros por defecto. */
  clearFilters(): void {
    this.state.clearFilters();
  }

  /** Notifica a los estudiantes y a la dirección del trabajo que se acerca su fecha de entrega. */
  remind(project: RawProjectData): void {
    this.reminders.remind(project);
  }

  /** Recordatorio a todos los trabajos próximos a vencer de la lista (los que aún no se recordaron hoy). */
  remindAll(): void {
    this.reminders.remindAll(this.dueSoonProjects());
  }

  /** Cantidad de trabajos que lleva el reporte (los que dejan los filtros) */
  readonly reportRows = computed(() => this.state.filteredData().length);

  /**
   * Descarga el reporte con los trabajos y filtros actuales en el formato
   * elegido. Termina cuando el archivo ya se generó (el Excel se arma aparte).
   */
  async downloadReport(format: StatisticsReportFormat): Promise<void> {
    const filters = this.state.currentFilters();
    const data = this.state.filteredData();
    const kpis: StatisticsReportKpis = {
      loaded: this.metrics.totalLoaded(),
      approved: this.metrics.totalApproved(),
      inProgress: this.metrics.totalInProgress(),
      rejected: this.metrics.totalNotApproved()
    };
    const directorName = this.state.directorsOptions().find(director => director.id === filters.directorId)?.name ?? null;
    const context = { scope: this.state.scope(), directorName };
    if (format === 'excel') await this.reportService.downloadExcelReport(filters, data, kpis, context);
    else if (format === 'csv') this.reportService.downloadCsvReport(filters, data, kpis, context);
    else await this.reportService.downloadPdfReport(filters, data, kpis, context);
  }

  /** Descarga el reporte de los trabajos próximos a vencer (los de la tabla, con los filtros actuales). */
  async downloadDueSoonReport(format: StatisticsReportFormat): Promise<void> {
    const filters = this.state.currentFilters();
    const directorName = this.state.directorsOptions().find(director => director.id === filters.directorId)?.name ?? null;
    await this.reportService.downloadDueSoonReport(format, filters, this.dueSoonProjects(),
      { scope: this.state.scope(), directorName });
  }
}
