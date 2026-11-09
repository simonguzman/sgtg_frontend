import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChartModule } from 'primeng/chart';
import { SearchableSelectComponent, SelectOption } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { StatisticsPageFacadeService } from './services/statistics-page-facade.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { DOUGHNUT_CHART_OPTIONS, BAR_CHART_OPTIONS } from './models/statistics-chart-options.model';
import { ARCHIVE_STATUS_OPTIONS } from './models/statistics-page.model';
import { DEADLINE_FILTER_OPTIONS, DeadlineFilterValue } from '../../interfaces/statisticsFilters.interface';
import { ReportFormatModalComponent } from '../../components/report-format-modal/report-format-modal.component';
import { StatisticsReportFormat } from '../../services/statistics-reports.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

/** Lista de textos como opciones del buscador (el texto es a la vez el valor) */
const comoOpciones = (valores: string[]): SelectOption[] => valores.map(valor => ({ id: valor, label: valor }));

@Component({
  selector: 'app-statistics-page',
  standalone: true,
  imports: [FormsModule, ChartModule, SearchableSelectComponent, ButtonComponent, ReportFormatModalComponent],
  templateUrl: './statistics-page.component.html',
  styleUrl: './statistics-page.component.css',
})
export class StatisticsPageComponent {
  protected readonly facade = inject(StatisticsPageFacadeService);
  private readonly notification = inject(NotificationService);
  /** Modal para elegir el formato del reporte */
  protected readonly isReportModalOpen = signal(false);
  protected readonly doughnutOptions = DOUGHNUT_CHART_OPTIONS;
  protected readonly barOptions = BAR_CHART_OPTIONS;
  protected readonly archiveOptions = ARCHIVE_STATUS_OPTIONS;
  protected readonly deadlineFilterOptions = DEADLINE_FILTER_OPTIONS;

  // Opciones de los filtros para el buscador (app-searchable-select): se puede escribir para filtrar la lista
  protected readonly stageSelectOptions: SelectOption[] = this.facade.stagesOptions
    .map(option => ({ id: option.value, label: option.label }));
  protected readonly periodSelectOptions = computed(() => comoOpciones(this.facade.periodsOptions()));
  protected readonly directorSelectOptions = computed<SelectOption[]>(() =>
    this.facade.directorsOptions().map(director => ({ id: director.id, label: director.name })));
  protected readonly modalitySelectOptions = computed(() => comoOpciones(this.facade.modalityOptions()));
  protected readonly programSelectOptions = computed(() => comoOpciones(this.facade.programOptions()));
  protected readonly archiveSelectOptions: SelectOption[] = ARCHIVE_STATUS_OPTIONS
    .map(option => ({ id: option.value, label: option.label }));
  protected readonly deadlineSelectOptions: SelectOption[] = DEADLINE_FILTER_OPTIONS
    .map(option => ({ id: option.value, label: option.label }));

  /** Al limpiar un filtro el buscador entrega '': sin filtro */
  onStageChange(stage: ProjectStage | string | null): void {
    this.facade.updateFilters({ stage: (stage || null) as ProjectStage | null });
  }

  onPeriodChange(period: string | null): void {
    this.facade.updateFilters({ period: period || null });
  }

  onDirectorChange(directorId: string | null): void {
    this.facade.updateFilters({ directorId: directorId || null });
  }

  onModalityChange(modality: string | null): void {
    this.facade.updateFilters({ modality: modality || null });
  }

  onProgramChange(program: string | null): void {
    this.facade.updateFilters({ program: program || null });
  }

  /** Estado y plazo siempre tienen un valor ("Todos" por defecto): no se pueden dejar vacíos */
  onArchiveStatusChange(archiveStatus: 'ACTIVE' | 'ARCHIVED' | 'ALL' | string): void {
    if (archiveStatus) this.facade.updateFilters({ archiveStatus: archiveStatus as 'ACTIVE' | 'ARCHIVED' | 'ALL' });
  }

  onDeadlineFilterChange(deadlineFilter: DeadlineFilterValue | string): void {
    if (deadlineFilter) this.facade.updateFilters({ deadlineFilter: deadlineFilter as DeadlineFilterValue });
  }

  handleDownloadReport(): void {
    this.isReportModalOpen.set(true);
  }

  async onReportFormatSelected(format: StatisticsReportFormat): Promise<void> {
    try {
      await this.facade.downloadReport(format);
    } catch (error) {
      console.error('No se pudo generar el reporte', error);
      this.notification.error('No se generó el reporte', 'Ocurrió un error al generar el archivo. Intenta de nuevo.');
    }
  }
}
