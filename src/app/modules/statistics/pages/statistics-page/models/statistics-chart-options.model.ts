import { ChartOptionsConfiguration } from '../../../interfaces/chartOptionsConfiguration.interface';

export const DOUGHNUT_CHART_OPTIONS: ChartOptionsConfiguration = {
  plugins: {
    legend: {
      position: 'bottom',
      labels: { color: '#334155' }
    }
  },
  maintainAspectRatio: false,
  aspectRatio: 0.8
};

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
  aspectRatio: 0.8
};
