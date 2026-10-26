import { computed, inject, Injectable } from '@angular/core';
import { StatisticsStateService } from './statistics-state.service';
import { ProjectStatus } from '../enum/projectStatus.enum';

/** Estados de un trabajo que sigue su proceso */
const EN_PROCESO: ProjectStatus[] = [
  ProjectStatus.EN_REVISION, ProjectStatus.EN_DESARROLLO, ProjectStatus.APLAZADO, ProjectStatus.SUSPENDIDO
];

/**
 * Calcula los KPIs (tarjetas de resumen) a partir de filteredData().
 * Separado del estado y de los gráficos: un componente que solo necesita
 * las 4 tarjetas de métricas no debería arrastrar la configuración de
 * colores/orden de los gráficos como dependencia — y viceversa (ISP).
 */
@Injectable({ providedIn: 'root' })
export class StatisticsMetricsService {
  private readonly state = inject(StatisticsStateService);

  public readonly totalLoaded = computed<number>(() =>
    this.state.filteredData().length
  );

  public readonly totalApproved = computed<number>(() =>
    this.state.filteredData().filter(p => p.status === ProjectStatus.APROBADO).length
  );

  /** Trabajos que siguen su proceso: en revisión, en desarrollo, aplazados o suspendidos */
  public readonly totalInProgress = computed<number>(() =>
    this.state.filteredData().filter(p => EN_PROCESO.includes(p.status)).length
  );

  public readonly totalNotApproved = computed<number>(() =>
    this.state.filteredData().filter(p =>
      p.status === ProjectStatus.NO_APROBADO || p.status === ProjectStatus.CANCELADO
    ).length
  );
}
