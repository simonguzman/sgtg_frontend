import { inject, Injectable } from '@angular/core';
import { StatisticsStateService } from '../../../services/statistics-state.service';
import { StatisticsMetricsService } from '../../../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../../../services/statistics-chart-data.service';
import { StatisticsReportService } from '../../../services/statistics-reports.service';
import { StatisticsFilters } from '../../../interfaces/statisticsFilters.interface';
import { StatisticsReportKpis } from '../../../interfaces/statisticsReportKpis.interface';

@Injectable({ providedIn: 'root' })
export class StatisticsPageFacadeService {
  private readonly state = inject(StatisticsStateService);
  private readonly metrics = inject(StatisticsMetricsService);
  private readonly chartData = inject(StatisticsChartDataService);
  private readonly reportService = inject(StatisticsReportService);

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

  downloadPdfReport(): void {
    const filters = this.state.currentFilters();
    const data = this.state.filteredData();
    const kpis: StatisticsReportKpis = {
      loaded: this.metrics.totalLoaded(),
      approved: this.metrics.totalApproved(),
      inProgress: this.metrics.totalInProgress(),
      rejected: this.metrics.totalNotApproved()
    };
    const directorName = this.state.directorsOptions().find(director => director.id === filters.directorId)?.name ?? null;
    this.reportService.downloadPdfReport(filters, data, kpis, { scope: this.state.scope(), directorName });
  }
}
