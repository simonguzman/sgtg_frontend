import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { StatisticsStateService } from '../../services/statistics-state.service';
import { ChartOptionsConfiguration } from '../../interfaces/chartOptionsConfiguration.interface';
import { ProjectStage } from '../../enum/projectStage.enum';
import { StatisticsReportService } from '../../services/statistics-reports.service';

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
  private readonly pdfService = inject(StatisticsReportService); // Inyectamos el nuevo servicio

  public doughnutOptions!: ChartOptionsConfiguration;
  public barOptions!: ChartOptionsConfiguration;

  public readonly archiveOptions = [
    { label: 'Activos en proceso', value: 'ACTIVE' },
    { label: 'Historial Archivados', value: 'ARCHIVED' },
    { label: 'Todos', value: 'ALL' }
  ];

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

  public onArchiveStatusChange(archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL'): void {
    this.state.updateFilters({ archiveStatus });
  }

  public handleDownloadReport(): void {
    // Recopilamos los datos en crudo desde los signals
    const currentFilters = this.state.currentFilters();
    const currentData = this.state.filteredData();

    const kpis = {
      loaded: this.state.totalLoaded(),
      approved: this.state.totalApproved(),
      obs: this.state.totalApprovedWithObservations(),
      rejected: this.state.totalNotApproved()
    };

    // Llamamos al servicio para que arme y descargue el PDF
    this.pdfService.downloadPdfReport(currentFilters, currentData, kpis);
  }
}
