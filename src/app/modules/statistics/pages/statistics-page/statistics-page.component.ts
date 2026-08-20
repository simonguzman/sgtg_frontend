import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { StatisticsPageFacadeService } from './services/statistics-page-facade.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { DOUGHNUT_CHART_OPTIONS, BAR_CHART_OPTIONS } from './models/statistics-chart-options.model';
import { ARCHIVE_STATUS_OPTIONS } from './models/statistics-page.model';
import { DEADLINE_FILTER_OPTIONS, DeadlineFilterValue } from '../../interfaces/statisticsFilters.interface';

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [FormsModule, ChartModule, SelectModule, ButtonComponent],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.css',
})
export class StatisticsPageComponent {
  protected readonly facade = inject(StatisticsPageFacadeService);
  protected readonly doughnutOptions = DOUGHNUT_CHART_OPTIONS;
  protected readonly barOptions = BAR_CHART_OPTIONS;
  protected readonly archiveOptions = ARCHIVE_STATUS_OPTIONS;
  // ← NUEVO
  protected readonly deadlineFilterOptions = DEADLINE_FILTER_OPTIONS;

  onStageChange(stage: ProjectStage | null): void {
    this.facade.updateFilters({ stage });
  }

  onPeriodChange(period: string | null): void {
    this.facade.updateFilters({ period });
  }

  onDirectorChange(directorId: string | null): void {
    this.facade.updateFilters({ directorId });
  }

  onArchiveStatusChange(archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL'): void {
    this.facade.updateFilters({ archiveStatus });
  }

  // ← NUEVO
  onDeadlineFilterChange(deadlineFilter: DeadlineFilterValue): void {
    this.facade.updateFilters({ deadlineFilter });
  }

  handleDownloadReport(): void {
    this.facade.downloadPdfReport();
  }
}
