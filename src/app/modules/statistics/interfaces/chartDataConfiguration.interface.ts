import { ChartDataset } from "./chartDataSet.interface";

export interface ChartDataConfiguration {
  labels: string[];
  datasets: ChartDataset[];
}
