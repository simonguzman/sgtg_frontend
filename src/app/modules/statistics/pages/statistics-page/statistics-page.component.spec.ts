import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';

import { StatisticsPageComponent } from './statistics-page.component';
import { StatisticsPageFacadeService } from './services/statistics-page-facade.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { DeadlineFilterValue, StatisticsFilters } from '../../interfaces/statisticsFilters.interface';
import { EvaluationDeadlineStatus } from '../../../../core/enums/evaluation-deadline-status.enum';

// ── Componentes y Módulos Originales a Remover ───────────────────────────────
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';

// ── Tipados Estrictos para Mocks (Zero 'any', 'unknown') ─────────────────────

interface MockChartData {
  labels: string[];
  datasets: Record<string, unknown>[];
}

interface MockOption {
  label: string;
  value: string | null;
}

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

// FIX: Para que Angular permita usar [ngModel] en un componente mock, este
// debe proveer NG_VALUE_ACCESSOR e implementar ControlValueAccessor.
@Component({
  selector: 'p-select',
  standalone: true,
  template: '',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MockPSelectComponent),
      multi: true,
    },
  ],
})
class MockPSelectComponent implements ControlValueAccessor {
  @Input() options!: unknown[];
  @Input() optionLabel!: string;
  @Input() optionValue!: string;
  @Input() placeholder!: string;
  @Input() showClear!: boolean;
  @Input() styleClass!: string;

  // Implementación vacía de ControlValueAccessor para satisfacer a FormsModule
  writeValue(value: unknown): void {}
  registerOnChange(fn: unknown): void {}
  registerOnTouched(fn: unknown): void {}
}

@Component({ selector: 'p-chart', standalone: true, template: '' })
class MockPChartComponent {
  @Input() type!: string;
  @Input() data!: MockChartData;
  @Input() options!: Record<string, unknown>;
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() icon!: string;
  @Output() onClick = new EventEmitter<void>();
}

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('StatisticsPageComponent', () => {
  let component: StatisticsPageComponent;
  let fixture: ComponentFixture<StatisticsPageComponent>;

  let mockFacadeService: {
    updateFilters: jest.Mock<void, [Partial<StatisticsFilters>]>;
    downloadPdfReport: jest.Mock<void, []>;
    clearFilters: jest.Mock<void, []>;
    currentFilters: WritableSignal<StatisticsFilters>;
    stagesOptions: MockOption[];
    periodsOptions: WritableSignal<string[]>;
    directorsOptions: WritableSignal<{ id: string; name: string }[]>;
    totalLoaded: WritableSignal<number>;
    totalApproved: WritableSignal<number>;
    totalApprovedWithObservations: WritableSignal<number>;
    totalNotApproved: WritableSignal<number>;
    statusChartData: WritableSignal<MockChartData>;
    stageChartData: WritableSignal<MockChartData>;
  };

  const initialFilters: StatisticsFilters = {
    stage: null,
    period: null,
    directorId: null,
    archiveStatus: 'ACTIVE',
    deadlineFilter: 'ALL',
  };

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacadeService = {
      updateFilters: jest.fn(),
      downloadPdfReport: jest.fn(),
      clearFilters: jest.fn(),

      currentFilters: signal<StatisticsFilters>(initialFilters),
      stagesOptions: [],
      periodsOptions: signal<string[]>([]),
      directorsOptions: signal<{ id: string; name: string }[]>([]),
      totalLoaded: signal<number>(0),
      totalApproved: signal<number>(0),
      totalApprovedWithObservations: signal<number>(0),
      totalNotApproved: signal<number>(0),
      statusChartData: signal<MockChartData>({ labels: [], datasets: [] }),
      stageChartData: signal<MockChartData>({ labels: [], datasets: [] }),
    };

    await TestBed.configureTestingModule({
      imports: [StatisticsPageComponent],
      providers: [
        { provide: StatisticsPageFacadeService, useValue: mockFacadeService },
      ],
    })
    .overrideComponent(StatisticsPageComponent, {
      remove: { imports: [ChartModule, SelectModule, ButtonComponent] },
      add: { imports: [MockPChartComponent, MockPSelectComponent, MockButtonComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(StatisticsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  describe('Inicialización', () => {
    it('debería crear el componente correctamente', () => {
      expect(component).toBeTruthy();
    });
  });

  describe('Interacciones del Usuario (Actualización de Filtros)', () => {
    it('debería delegar el cambio de Etapa (Stage) al Facade', () => {
      component.onStageChange(ProjectStage.PROPUESTA);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        stage: ProjectStage.PROPUESTA,
      });
    });

    it('debería permitir limpiar la Etapa enviando null', () => {
      component.onStageChange(null);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        stage: null,
      });
    });

    it('debería delegar el cambio de Periodo al Facade', () => {
      component.onPeriodChange('2026-1');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        period: '2026-1',
      });
    });

    it('debería delegar el cambio de Director al Facade', () => {
      component.onDirectorChange('dir-123');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        directorId: 'dir-123',
      });
    });

    it('debería delegar el cambio de Estado de Archivo al Facade', () => {
      component.onArchiveStatusChange('ARCHIVED');

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        archiveStatus: 'ARCHIVED',
      });
    });

    it('debería delegar el cambio de Plazo de Evaluación al Facade', () => {
      const deadlineValue: DeadlineFilterValue = EvaluationDeadlineStatus.DELAYED;

      component.onDeadlineFilterChange(deadlineValue);

      expect(mockFacadeService.updateFilters).toHaveBeenCalledTimes(1);
      expect(mockFacadeService.updateFilters).toHaveBeenCalledWith({
        deadlineFilter: deadlineValue,
      });
    });
  });

  describe('Acciones', () => {
    it('debería delegar la descarga del reporte PDF al Facade', () => {
      component.handleDownloadReport();

      expect(mockFacadeService.downloadPdfReport).toHaveBeenCalledTimes(1);
    });
  });
});
