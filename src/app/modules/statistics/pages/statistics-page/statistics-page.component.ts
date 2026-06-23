import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { StatisticsStateService } from '../../services/statistics-state.service';
import { ChartOptionsConfiguration } from '../../interfaces/chartOptionsConfiguration.enum';
import { ProjectStage } from '../../enum/projectStage.enum';

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ChartModule,
    SelectModule,
    ButtonComponent
  ],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.css',
})
export class StatisticsPageComponent implements OnInit {

  public readonly state = inject(StatisticsStateService);

  public doughnutOptions!: ChartOptionsConfiguration;
  public barOptions!: ChartOptionsConfiguration;

  ngOnInit(): void {
    this.initializeChartOptions();
  }

  private initializeChartOptions(): void {
    this.doughnutOptions = {
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#334155' }
        }
      },
      maintainAspectRatio: false,
      aspectRatio: 0.8
    };

    this.barOptions = {
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
  }

  public onStageChange(stage: ProjectStage | null): void {
    this.state.updateFilters({ stage });
  }

  public onPeriodChange(period: string | null): void {
    this.state.updateFilters({ period });
  }

  public onDirectorChange(directorId: string | null): void {
    this.state.updateFilters({ directorId });
  }

  public handleDownloadReport(): void {
    console.log('Generando reporte con filtros actuales:', this.state.currentFilters());
  }
}
