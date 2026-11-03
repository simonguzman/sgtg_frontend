export interface ChartOptionsConfiguration {
  plugins?: {
    legend?: {
      display?: boolean;
      position?: 'top' | 'bottom' | 'left' | 'right';
      labels?: {
        color?: string;
      };
    };
    title?: {
      display?: boolean;
      text?: string;
      color?: string;
    };
  };
  scales?: Record<string, {
    grid?: {
      color?: string;
      drawBorder?: boolean;
    };
    ticks?: {
      color?: string;
    };
  }>;
  maintainAspectRatio?: boolean;
  aspectRatio?: number;
  /** false: el gráfico se dibuja una vez, sin animar la entrada ni cada cambio de los filtros */
  animation?: false;
}
