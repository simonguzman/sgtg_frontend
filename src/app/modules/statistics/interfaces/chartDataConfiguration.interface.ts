import { ChartDataset } from "./chartDataSet.interface";

/** Datos de un gráfico de Chart.js: etiquetas y series. */
export interface ChartDataConfiguration {
  labels: string[];
  datasets: ChartDataset[];
}
