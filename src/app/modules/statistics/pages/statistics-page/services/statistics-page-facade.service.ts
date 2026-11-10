import { computed, inject, Injectable } from '@angular/core';
import { StatisticsStateService } from '../../../services/statistics-state.service';
import { StatisticsMetricsService } from '../../../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../../../services/statistics-chart-data.service';
import { StatisticsReportFormat, StatisticsReportService } from '../../../services/statistics-reports.service';
import { StatisticsFilters } from '../../../interfaces/statisticsFilters.interface';
import { StatisticsReportKpis } from '../../../interfaces/statisticsReportKpis.interface';
import { StatisticsRemindersService } from '../../../services/statistics-reminders.service';
import { RawProjectData } from '../../../interfaces/rawProjectData.interface';

@Injectable({ providedIn: 'root' })
export class StatisticsPageFacadeService {
  private readonly state = inject(StatisticsStateService);
  private readonly metrics = inject(StatisticsMetricsService);
  private readonly chartData = inject(StatisticsChartDataService);
  private readonly reportService = inject(StatisticsReportService);
  private readonly reminders = inject(StatisticsRemindersService);

  readonly currentFilters = this.state.currentFilters;
  readonly stagesOptions = this.state.stagesOptions;
  readonly periodsOptions = this.state.periodsOptions;
  readonly directorsOptions = this.state.directorsOptions;
  readonly modalityOptions = this.state.modalityOptions;
  readonly programOptions = this.state.programOptions;
  readonly scope = this.state.scope;
  readonly totalLoaded = this.metrics.totalLoaded;
  readonly totalApproved = this.metrics.totalApproved;
  readonly totalInProgress = this.metrics.totalInProgress;
  readonly totalNotApproved = this.metrics.totalNotApproved;
  /** Trabajos de grado próximos a vencer (a 30 días o menos de la fecha máxima de entrega), del más urgente */
  readonly dueSoonProjects = this.metrics.dueSoonProjects;
  readonly totalDueSoon = this.metrics.totalDueSoon;
  /** Quién recuerda la entrega y quién abre el detalle del trabajo */
  readonly canRemind = this.reminders.canRemind;
  readonly canOpenDetails = this.reminders.canOpenDetails;
  readonly sendingReminder = this.reminders.sending;
  readonly remindedToday = this.reminders.reminded;
  readonly statusChartData = this.chartData.statusChartData;
  readonly stageChartData = this.chartData.stageChartData;
  readonly modalityChartData = this.chartData.modalityChartData;
  readonly programChartData = this.chartData.programChartData;

  updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.state.updateFilters(newFilters);
  }

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
