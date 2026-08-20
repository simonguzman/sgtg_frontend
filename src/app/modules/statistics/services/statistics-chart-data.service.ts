import { computed, inject, Injectable } from '@angular/core';
import { StatisticsStateService } from './statistics-state.service';
import { ChartDataConfiguration } from '../interfaces/chartDataConfiguration.interface';
import {
  STATUS_CHART_LABELS, STATUS_CHART_ORDER, STATUS_CHART_COLORS,
  STAGE_CHART_LABELS, STAGE_CHART_ORDER, STAGE_CHART_COLORS
} from '../models/statistics-chart.model';

@Injectable({ providedIn: 'root' })
export class StatisticsChartDataService {
  private readonly state = inject(StatisticsStateService);

  // ← Antes: 8 líneas de `.filter(p => p.status === X).length` escritas a
  // mano. Ahora: un solo .map() sobre STATUS_CHART_ORDER — agregar un
  // ProjectStatus nuevo al gráfico solo requiere tocar el modelo.
  public readonly statusChartData = computed<ChartDataConfiguration>(() => {
    const data = this.state.filteredData();

    return {
      labels: STATUS_CHART_LABELS,
      datasets: [{
        data: STATUS_CHART_ORDER.map(status => data.filter(p => p.status === status).length),
        backgroundColor: STATUS_CHART_COLORS.background,
        borderColor: STATUS_CHART_COLORS.border,
        borderWidth: 1
      }]
    };
  });

  public readonly stageChartData = computed<ChartDataConfiguration>(() => {
    const data = this.state.filteredData();

    return {
      labels: STAGE_CHART_LABELS,
      datasets: [{
        label: 'Proyectos Activos',
        data: STAGE_CHART_ORDER.map(stage => data.filter(p => p.stage === stage).length),
        backgroundColor: STAGE_CHART_COLORS,
        borderWidth: 0
      }]
    };
  });
}
