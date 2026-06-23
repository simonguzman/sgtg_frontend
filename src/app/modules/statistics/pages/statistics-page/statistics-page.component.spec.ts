import { TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { FormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { StatisticsPageComponent } from './statistics-page.component';
import { StatisticsStateService } from '../../services/statistics-state.service';
import { ProjectStage } from '../../enum/projectStage.enum';
import { StatisticsFilters } from '../../interfaces/statisticsFilters.enum';

/* ============================================================================
   STUBS DE COMPONENTES EXTERNOS
   Propósito: Sustituir app-button-component, p-select y p-chart por versiones
   mínimas con el MISMO selector y las mismas entradas/salidas que el template
   real consume. Esto permite probar el árbol de bindings del componente sin
   importar PrimeNG completo (que arrastra Chart.js, overlays, CDK, etc.).

   NOTA TÉCNICA IMPORTANTE sobre SelectStubComponent:
   El template usa [ngModel] + (ngModelChange) por separado. Esa sintaxis
   activa la directiva real NgModel de FormsModule sobre el elemento, la cual
   exige un ControlValueAccessor en el host. Si el stub no lo implementa,
   Angular lanza error en tiempo de ejecución al hacer detectChanges(). Por
   eso el stub implementa writeValue/registerOnChange explícitamente.
   ============================================================================ */

@Component({
  selector: 'app-button-component',
  standalone: true,
  template: `<button type="button" (click)="onClick.emit()">{{ label }}</button>`
})
class ButtonStubComponent {
  @Input() label = '';
  @Input() variant: 'primary' | 'secondary' = 'primary';
  @Input() icon?: string;
  @Input() disabled = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({
  selector: 'p-select',
  standalone: true,
  template: `<select></select>`,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectStubComponent),
      multi: true
    }
  ]
})
class SelectStubComponent implements ControlValueAccessor {
  @Input() options: unknown[] = [];
  @Input() optionLabel?: string;
  @Input() optionValue?: string;
  @Input() placeholder?: string;
  @Input() showClear?: boolean;
  @Input() styleClass?: string;

  value: unknown = null;
  private onChangeCallback: (value: unknown) => void = () => {};

  writeValue(value: unknown): void {
    this.value = value;
  }
  registerOnChange(fn: (value: unknown) => void): void {
    this.onChangeCallback = fn;
  }
  registerOnTouched(): void {}

  /** Helper de test: simula que el usuario seleccionó un valor en el select real */
  selectValue(value: unknown): void {
    this.value = value;
    this.onChangeCallback(value);
  }
}

@Component({
  selector: 'p-chart',
  standalone: true,
  template: `<canvas></canvas>`
})
class ChartStubComponent {
  @Input() type = '';
  @Input() data: unknown;
  @Input() options: unknown;
}

describe('Component: StatisticsPageComponent', () => {
  let mockStateService: {
    updateFilters: jest.Mock;
    clearFilters: jest.Mock;
    currentFilters: jest.Mock;
    periodsOptions: jest.Mock;
    directorsOptions: jest.Mock;
    stagesOptions: jest.Mock;
    totalLoaded: jest.Mock;
    totalApproved: jest.Mock;
    totalApprovedWithObservations: jest.Mock;
    totalNotApproved: jest.Mock;
    statusChartData: jest.Mock;
    stageChartData: jest.Mock;
  };

  const defaultFilters: StatisticsFilters = { stage: null, period: null, directorId: null };

  beforeEach(() => {
    // 💡 Mock completo del servicio, reutilizado por ambas suites de este archivo
    mockStateService = {
      updateFilters: jest.fn(),
      clearFilters: jest.fn(),
      currentFilters: jest.fn().mockReturnValue(defaultFilters),
      periodsOptions: jest.fn().mockReturnValue([]),
      directorsOptions: jest.fn().mockReturnValue([]),
      stagesOptions: jest.fn().mockReturnValue([]),
      totalLoaded: jest.fn().mockReturnValue(0),
      totalApproved: jest.fn().mockReturnValue(0),
      totalApprovedWithObservations: jest.fn().mockReturnValue(0),
      totalNotApproved: jest.fn().mockReturnValue(0),
      statusChartData: jest.fn().mockReturnValue({ labels: [], datasets: [] }),
      stageChartData: jest.fn().mockReturnValue({ labels: [], datasets: [] })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /* ==========================================================================
     SUITE 1 — LÓGICA DE LA CLASE (AISLADA DEL DOM)
     El template se sobreescribe por uno vacío para probar únicamente
     ngOnInit, los handlers de filtros y handleDownloadReport, sin depender
     de PrimeNG ni de bindings del HTML real.
     ========================================================================== */
  describe('Lógica de la clase (aislada del DOM)', () => {
    let component: StatisticsPageComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [StatisticsPageComponent],
        providers: [
          { provide: StatisticsStateService, useValue: mockStateService }
        ]
      });

      TestBed.overrideComponent(StatisticsPageComponent, {
        set: { template: '<div></div>' }
      });

      const fixture = TestBed.createComponent(StatisticsPageComponent);
      component = fixture.componentInstance;
    });

    it('Debe crear el componente', () => {
      expect(component).toBeTruthy();
    });

    describe('Inicialización de opciones de gráficos (ngOnInit)', () => {
      beforeEach(() => {
        component.ngOnInit();
      });

      it('Debe configurar correctamente doughnutOptions', () => {
        expect(component.doughnutOptions).toBeDefined();
        expect(component.doughnutOptions.maintainAspectRatio).toBe(false);
        expect(component.doughnutOptions.aspectRatio).toBe(0.8);
        expect(component.doughnutOptions.plugins?.legend?.position).toBe('bottom');
        expect(component.doughnutOptions.plugins?.legend?.labels?.color).toBe('#334155');
      });

      it('Debe configurar correctamente barOptions', () => {
        expect(component.barOptions).toBeDefined();
        expect(component.barOptions.maintainAspectRatio).toBe(false);
        expect(component.barOptions.aspectRatio).toBe(0.8);
        expect(component.barOptions.plugins?.legend?.display).toBe(false);
        expect(component.barOptions.scales?.['x']?.ticks?.color).toBe('#475569');
        expect(component.barOptions.scales?.['y']?.grid?.color).toBe('#f1f5f9');
      });
    });

    describe('Manejo de filtros', () => {
      it('onStageChange debe delegar en state.updateFilters con la etapa seleccionada', () => {
        component.onStageChange(ProjectStage.PROPUESTA);
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ stage: ProjectStage.PROPUESTA });
      });

      it('onStageChange debe permitir limpiar el filtro con null', () => {
        component.onStageChange(null);
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ stage: null });
      });

      it('onPeriodChange debe delegar en state.updateFilters con el periodo seleccionado', () => {
        component.onPeriodChange('2026-1');
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ period: '2026-1' });
      });

      it('onDirectorChange debe delegar en state.updateFilters con el director seleccionado', () => {
        component.onDirectorChange('dir-1');
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ directorId: 'dir-1' });
      });

      it('Cada handler debe enviar únicamente su propio campo, sin pisar los demás filtros', () => {
        component.onStageChange(ProjectStage.ANTEPROYECTO);
        component.onPeriodChange('2025-2');
        component.onDirectorChange('dir-9');

        expect(mockStateService.updateFilters).toHaveBeenNthCalledWith(1, { stage: ProjectStage.ANTEPROYECTO });
        expect(mockStateService.updateFilters).toHaveBeenNthCalledWith(2, { period: '2025-2' });
        expect(mockStateService.updateFilters).toHaveBeenNthCalledWith(3, { directorId: 'dir-9' });
      });
    });

    describe('Descarga de reporte', () => {
      it('handleDownloadReport debe leer los filtros actuales del estado', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const activeFilters: StatisticsFilters = {
          stage: ProjectStage.TRABAJO_GRADO,
          period: '2026-1',
          directorId: 'dir-1'
        };
        mockStateService.currentFilters.mockReturnValue(activeFilters);

        component.handleDownloadReport();

        expect(mockStateService.currentFilters).toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Generando reporte con filtros actuales:', activeFilters);

        consoleSpy.mockRestore();
      });
    });
  });

  /* ==========================================================================
     SUITE 2 — INTEGRACIÓN CON EL TEMPLATE REAL
     Usa el HTML real del componente, reemplazando solo las dependencias
     externas (PrimeNG, app-button-component) por stubs equivalentes.
     Verifica que los bindings del template realmente disparan los métodos
     correctos y que los datos del servicio llegan a los lugares correctos.
     ========================================================================== */
  describe('Integración con el template real', () => {
    let fixture: ReturnType<typeof TestBed.createComponent<StatisticsPageComponent>>;
    let component: StatisticsPageComponent;

    beforeEach(() => {
      TestBed.configureTestingModule({
        imports: [StatisticsPageComponent],
        providers: [
          { provide: StatisticsStateService, useValue: mockStateService }
        ]
      });

      // Sustituye los imports standalone reales (ChartModule, SelectModule,
      // ButtonComponent) por los stubs equivalentes, conservando CommonModule
      // y FormsModule porque [ngModel]/(ngModelChange) los necesita.
      TestBed.overrideComponent(StatisticsPageComponent, {
        set: {
          imports: [CommonModule, FormsModule, ButtonStubComponent, SelectStubComponent, ChartStubComponent]
        }
      });

      fixture = TestBed.createComponent(StatisticsPageComponent);
      component = fixture.componentInstance;
      component.ngOnInit(); // Necesario: el template usa doughnutOptions/barOptions
      fixture.detectChanges();
    });

    function getButtonStubByLabel(label: string): ButtonStubComponent {
      const buttons = fixture.debugElement.queryAll(By.directive(ButtonStubComponent));
      const match = buttons.find(b => (b.componentInstance as ButtonStubComponent).label === label);
      if (!match) throw new Error(`No se encontró app-button-component con label "${label}"`);
      return match.componentInstance as ButtonStubComponent;
    }

    function getSelectStubById(id: string): SelectStubComponent {
      const el = fixture.debugElement.query(By.css(`#${id}`));
      if (!el) throw new Error(`No se encontró p-select con id "${id}"`);
      return el.componentInstance as SelectStubComponent;
    }

    it('Debe crear el componente con el template real', () => {
      expect(component).toBeTruthy();
    });

    describe('Botones de acción', () => {
      it('Al hacer click en "Generar Reporte PDF" debe invocar handleDownloadReport()', () => {
        const spy = jest.spyOn(component, 'handleDownloadReport');
        const button = getButtonStubByLabel('Generar Reporte PDF');

        button.onClick.emit();

        expect(spy).toHaveBeenCalledTimes(1);
      });

      it('Al hacer click en "Limpiar Filtros" debe invocar state.clearFilters()', () => {
        // El template llama a state.clearFilters() directamente, sin pasar
        // por un método del componente — por eso se verifica sobre el mock.
        const button = getButtonStubByLabel('Limpiar Filtros');

        button.onClick.emit();

        expect(mockStateService.clearFilters).toHaveBeenCalledTimes(1);
      });
    });

    describe('Filtros (p-select)', () => {
      it('Debe pasar stagesOptions() al select de etapa y propagar su cambio a onStageChange', () => {
        const stagesMock = [{ label: 'Propuesta', value: ProjectStage.PROPUESTA }];
        mockStateService.stagesOptions.mockReturnValue(stagesMock);
        fixture.detectChanges();

        const select = getSelectStubById('stageFilter');
        expect(select.options).toEqual(stagesMock);
        expect(select.optionLabel).toBe('label');
        expect(select.optionValue).toBe('value');

        const onStageChangeSpy = jest.spyOn(component, 'onStageChange');
        select.selectValue(ProjectStage.PROPUESTA);

        expect(onStageChangeSpy).toHaveBeenCalledWith(ProjectStage.PROPUESTA);
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ stage: ProjectStage.PROPUESTA });
      });

      it('Debe pasar periodsOptions() al select de periodo SIN optionLabel/optionValue', () => {
        const periodsMock = ['2026-1', '2025-2'];
        mockStateService.periodsOptions.mockReturnValue(periodsMock);
        fixture.detectChanges();

        const select = getSelectStubById('periodFilter');
        expect(select.options).toEqual(periodsMock);
        expect(select.optionLabel).toBeUndefined();
        expect(select.optionValue).toBeUndefined();

        const onPeriodChangeSpy = jest.spyOn(component, 'onPeriodChange');
        select.selectValue('2026-1');

        expect(onPeriodChangeSpy).toHaveBeenCalledWith('2026-1');
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ period: '2026-1' });
      });

      it('Debe pasar directorsOptions() al select de director y propagar su cambio a onDirectorChange', () => {
        const directorsMock = [{ id: 'dir-1', name: 'Juan Pérez' }];
        mockStateService.directorsOptions.mockReturnValue(directorsMock);
        fixture.detectChanges();

        const select = getSelectStubById('directorFilter');
        expect(select.options).toEqual(directorsMock);
        expect(select.optionLabel).toBe('name');
        expect(select.optionValue).toBe('id');

        const onDirectorChangeSpy = jest.spyOn(component, 'onDirectorChange');
        select.selectValue('dir-1');

        expect(onDirectorChangeSpy).toHaveBeenCalledWith('dir-1');
        expect(mockStateService.updateFilters).toHaveBeenCalledWith({ directorId: 'dir-1' });
      });

      it('Debe reflejar en los selects los valores actuales de currentFilters()', async () => {
        const activeFilters: StatisticsFilters = {
          stage: ProjectStage.TRABAJO_GRADO,
          period: '2026-1',
          directorId: 'dir-1'
        };
        mockStateService.currentFilters.mockReturnValue(activeFilters);

        // 1. Dispara la primera verificación de cambios para inicializar los bindings de NgModel
        fixture.detectChanges();

        // 2. Espera a que se resuelvan las promesas/microtareas asíncronas internas de NgModel
        await fixture.whenStable();

        // 3. Verifica los valores una vez que writeValue() ya fue ejecutado en los stubs
        expect(getSelectStubById('stageFilter').value).toBe(ProjectStage.TRABAJO_GRADO);
        expect(getSelectStubById('periodFilter').value).toBe('2026-1');
        expect(getSelectStubById('directorFilter').value).toBe('dir-1');
      });
    });

    describe('Tarjetas de KPIs', () => {
      // 💡 Nota de fragilidad: el template no expone data-testid en las tarjetas,
      // así que se selecciona por orden de aparición (clase .text-3xl). Si se
      // reordenan las tarjetas en el HTML, este test debe revisarse. Se sugiere
      // agregar data-testid="kpi-total" / "kpi-approved" / etc. en el template
      // para mayor robustez a futuro.
      it('Debe mostrar los valores de totalLoaded, totalApproved, totalApprovedWithObservations y totalNotApproved', () => {
        mockStateService.totalLoaded.mockReturnValue(42);
        mockStateService.totalApproved.mockReturnValue(10);
        mockStateService.totalApprovedWithObservations.mockReturnValue(5);
        mockStateService.totalNotApproved.mockReturnValue(3);
        fixture.detectChanges();

        const values = fixture.nativeElement.querySelectorAll('.text-3xl');
        expect(values.length).toBe(4);
        expect(values[0].textContent.trim()).toBe('42');
        expect(values[1].textContent.trim()).toBe('10');
        expect(values[2].textContent.trim()).toBe('5');
        expect(values[3].textContent.trim()).toBe('3');
      });
    });

    describe('Gráficos (p-chart)', () => {
      it('Debe pasar statusChartData() y doughnutOptions al gráfico de dona', () => {
        const chartData = { labels: ['A'], datasets: [{ data: [1] }] };
        mockStateService.statusChartData.mockReturnValue(chartData);
        fixture.detectChanges();

        const chartStubs = fixture.debugElement.queryAll(By.directive(ChartStubComponent));
        const doughnut = chartStubs.find(c => (c.componentInstance as ChartStubComponent).type === 'doughnut');

        expect(doughnut).toBeTruthy();
        expect((doughnut!.componentInstance as ChartStubComponent).data).toEqual(chartData);
        expect((doughnut!.componentInstance as ChartStubComponent).options).toEqual(component.doughnutOptions);
      });

      it('Debe pasar stageChartData() y barOptions al gráfico de barras', () => {
        const chartData = { labels: ['B'], datasets: [{ data: [2] }] };
        mockStateService.stageChartData.mockReturnValue(chartData);
        fixture.detectChanges();

        const chartStubs = fixture.debugElement.queryAll(By.directive(ChartStubComponent));
        const bar = chartStubs.find(c => (c.componentInstance as ChartStubComponent).type === 'bar');

        expect(bar).toBeTruthy();
        expect((bar!.componentInstance as ChartStubComponent).data).toEqual(chartData);
        expect((bar!.componentInstance as ChartStubComponent).options).toEqual(component.barOptions);
      });
    });
  });
});
