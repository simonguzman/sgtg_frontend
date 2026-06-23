import { ChartDataset } from "./chartDataSet.enum";

export interface ChartDataConfiguration {
  labels: string[];
  datasets: ChartDataset[];
}
