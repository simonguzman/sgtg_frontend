import { ChartOptionsConfiguration } from '../../../interfaces/chartOptionsConfiguration.interface';

// Configuración estática de los dos gráficos del dashboard. Antes se
// construía en ngOnInit() con propiedades `!` (aserción no-nula) pese a
// que ninguno de los dos objetos depende de datos del componente ni
// cambia después de creado — son literales de configuración de PrimeNG
// Chart, así que se extraen como constantes de módulo, mismo patrón que
// STAGE_OPTIONS o PROPOSAL_COLUMNS.
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
