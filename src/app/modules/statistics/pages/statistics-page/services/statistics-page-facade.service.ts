import { inject, Injectable } from '@angular/core';
import { StatisticsStateService } from '../../../services/statistics-state.service';
import { StatisticsMetricsService } from '../../../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../../../services/statistics-chart-data.service';
// ⚠️ Verifica el nombre real de este archivo en tu proyecto — tu import
// original decía 'statistics-reports.service' (con "s"). Ajusta si es
// necesario.
import { StatisticsReportService } from '../../../services/statistics-reports.service';
import { StatisticsFilters } from '../../../interfaces/statisticsFilters.interface';
import { StatisticsReportKpis } from '../../../interfaces/statisticsReportKpis.interface';

/**
 * Consolida el acceso de la página a los 3 servicios de estadísticas
 * (estado/filtros, métricas, datos de gráficos) más la orquestación del
 * reporte PDF. El componente ya no necesita saber que existen 3 servicios
 * distintos detrás — solo ve una superficie de lectura (signals) y un
 * puñado de acciones, igual que ProposalFacadeService o
 * ThesisWorkPageFacadeService.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsPageFacadeService {
  private readonly state = inject(StatisticsStateService);
  private readonly metrics = inject(StatisticsMetricsService);
  private readonly chartData = inject(StatisticsChartDataService);
  private readonly reportService = inject(StatisticsReportService);

  // ── Filtros y opciones ──────────────────────────────────────────────────
  readonly currentFilters = this.state.currentFilters;
  // Nota: stagesOptions ya NO es un signal (ver StatisticsStateService) —
  // es una constante plana. Se re-expone tal cual, sin envolverla.
  readonly stagesOptions = this.state.stagesOptions;
  readonly periodsOptions = this.state.periodsOptions;
  readonly directorsOptions = this.state.directorsOptions;

  // ── KPIs ─────────────────────────────────────────────────────────────────
  readonly totalLoaded = this.metrics.totalLoaded;
  readonly totalApproved = this.metrics.totalApproved;
  readonly totalApprovedWithObservations = this.metrics.totalApprovedWithObservations;
  readonly totalNotApproved = this.metrics.totalNotApproved;

  // ── Gráficos ─────────────────────────────────────────────────────────────
  readonly statusChartData = this.chartData.statusChartData;
  readonly stageChartData = this.chartData.stageChartData;

  updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.state.updateFilters(newFilters);
  }

  clearFilters(): void {
    this.state.clearFilters();
  }

  // ← Antes vivía en el componente: leía 3 signals de estado + 4 de
  // métricas para armar el objeto que necesita StatisticsReportService.
  // Es coordinación entre servicios, no presentación — pertenece aquí.
  downloadPdfReport(): void {
    const filters = this.state.currentFilters();
    const data = this.state.filteredData();
    const kpis: StatisticsReportKpis = {
      loaded: this.metrics.totalLoaded(),
      approved: this.metrics.totalApproved(),
      obs: this.metrics.totalApprovedWithObservations(),
      rejected: this.metrics.totalNotApproved()
    };
    this.reportService.downloadPdfReport(filters, data, kpis);
  }
}
