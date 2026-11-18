import { ChartOptionsConfiguration } from '../../../interfaces/chartOptionsConfiguration.interface';

/**
 * Opciones de los gráficos circulares. Van sin animación: redibujar los cuatro gráficos con cada filtro era
 * la mayor parte del trabajo de la página en un equipo lento.
 */
export const DOUGHNUT_CHART_OPTIONS: ChartOptionsConfiguration = {
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#334155' }
    }
  },
  maintainAspectRatio: false,
  aspectRatio: 0.8,
  animation: false
};

/** Opciones de los gráficos de barras, también sin animación. */
export const BAR_CHART_OPTIONS: ChartOptionsConfiguration = {
  plugins: {
    legend: { display: false }
  },
  scales: {
    x: {
      ticks: { color: '#475569' },
      grid: { drawBorder: false }
    },
    y: {
      ticks: { color: '#475569' },
      grid: { color: '#f1f5f9' }
    }
  },
  maintainAspectRatio: false,
  aspectRatio: 0.8,
  animation: false
};
