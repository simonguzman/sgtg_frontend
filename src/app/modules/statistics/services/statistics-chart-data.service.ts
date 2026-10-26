import { computed, inject, Injectable } from '@angular/core';
import { StatisticsStateService } from './statistics-state.service';
import { ChartDataConfiguration } from '../interfaces/chartDataConfiguration.interface';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import {
  STATUS_CHART_LABELS, STATUS_CHART_ORDER, STATUS_CHART_COLORS,
  STAGE_CHART_LABELS, STAGE_CHART_ORDER, STAGE_CHART_COLORS, CATEGORY_CHART_COLORS
} from '../models/statistics-chart.model';

/** Cantidad de trabajos por cada valor del campo, de mayor a menor */
function countBy(data: RawProjectData[], field: 'modality' | 'program'): { labels: string[]; counts: number[] } {
  const counts = new Map<string, number>();
  data.forEach(project => counts.set(project[field], (counts.get(project[field]) ?? 0) + 1));
  const entries = Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { labels: entries.map(([label]) => label), counts: entries.map(([, count]) => count) };
}

const colorsFor = (count: number) =>
  Array.from({ length: count }, (_, i) => CATEGORY_CHART_COLORS[i % CATEGORY_CHART_COLORS.length]);

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
        label: 'Trabajos',
        data: STAGE_CHART_ORDER.map(stage => data.filter(p => p.stage === stage).length),
        backgroundColor: STAGE_CHART_COLORS,
        borderWidth: 0
      }]
    };
  });

  public readonly modalityChartData = computed<ChartDataConfiguration>(() => {
    const { labels, counts } = countBy(this.state.filteredData(), 'modality');
    return {
      labels,
      datasets: [{ data: counts, backgroundColor: colorsFor(counts.length), borderWidth: 1 }]
    };
  });

  public readonly programChartData = computed<ChartDataConfiguration>(() => {
    const { labels, counts } = countBy(this.state.filteredData(), 'program');
    return {
      labels,
      datasets: [{ label: 'Trabajos', data: counts, backgroundColor: colorsFor(counts.length), borderWidth: 0 }]
    };
  });
}
