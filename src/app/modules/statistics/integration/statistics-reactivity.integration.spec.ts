import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { StatisticsStateService } from '../services/statistics-state.service';
import { StatisticsMetricsService } from '../services/statistics-metrics.service';
import { StatisticsChartDataService } from '../services/statistics-chart-data.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { ProjectStage } from '../enum/projectStage.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  cerrarTrabajo, crearTrabajoConAnteproyectoRadicado, crearTrabajoDePrueba, crearTrabajoEnCurso
} from '../../../testing/trabajo-grado-de-prueba';

const decanatura: User = {
  id: '80', idType: IdentificationType.CC, idNumber: 80, firstName: 'Decana', lastName: 'Facultad',
  secondLastName: '', codeNumber: 80, email: 'decanatura@unicauca.edu.co', state: UserState.active,
  roles: [UserRoleType.DECANATURA]
};

/**
 * Propuesta aprobada en 2026-1 (id 1), anteproyecto radicado (id 2), trabajo
 * en curso (id 3) y una propuesta anulada (id 4, archivada).
 */
const trabajos = () => {
  const aprobada = crearTrabajoDePrueba({ id: 1 });
  return [
    { ...aprobada, propuesta: { ...aprobada.propuesta,
      versiones: aprobada.propuesta.versiones.map(v => ({ ...v, estado: 'APROBADO' as const })) } },
    crearTrabajoConAnteproyectoRadicado({ id: 2 }),
    crearTrabajoEnCurso({ id: 3 }),
    cerrarTrabajo(crearTrabajoDePrueba({ id: 4 }), 'CANCELADO', 'ANULACION_DIRECTOR')
  ];
};

describe('Estadísticas - Integración del motor reactivo con los trabajos del backend', () => {
  let state: StatisticsStateService;
  let metrics: StatisticsMetricsService;
  let charts: StatisticsChartDataService;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    state = TestBed.inject(StatisticsStateService);
    metrics = TestBed.inject(StatisticsMetricsService);
    charts = TestBed.inject(StatisticsChartDataService);
    // Decanatura consulta todos los trabajos
    iniciarSesionConTrabajos(decanatura, trabajos());
  });

  afterEach(() => jest.restoreAllMocks());

  it('cada trabajo se cuenta una sola vez y por defecto solo los activos', () => {
    expect(state.rawData()).toHaveLength(4);
    expect(metrics.totalLoaded()).toBe(3);
    expect(metrics.totalApproved()).toBe(1);
    expect(metrics.totalNotApproved()).toBe(0);
  });

  it('el gráfico por etapa cuenta un trabajo por etapa', () => {
    const grafico = charts.stageChartData();
    const valor = (etiqueta: string) => grafico.datasets[0].data[grafico.labels.indexOf(etiqueta)];
    expect(valor('Propuestas')).toBe(1);
    expect(valor('Anteproyectos')).toBe(1);
    expect(valor('Trabajos de Grado')).toBe(1);
  });

  it('al incluir los archivados cuenta la anulación como cancelado', () => {
    state.updateFilters({ archiveStatus: 'ALL' });
    expect(metrics.totalLoaded()).toBe(4);
    expect(metrics.totalNotApproved()).toBe(1);
    const grafico = charts.statusChartData();
    expect(grafico.datasets[0].data[grafico.labels.indexOf('Cancelados')]).toBe(1);
  });

  it('filtra por etapa y restablece los filtros', () => {
    state.updateFilters({ stage: ProjectStage.ANTEPROYECTO });
    expect(state.filteredData().map(d => d.id)).toEqual(['2']);
    state.clearFilters();
    expect(metrics.totalLoaded()).toBe(3);
  });

  it('se recalcula cuando cambia un trabajo en el almacén', () => {
    TestBed.inject(TrabajoGradoStoreService).upsert(
      cerrarTrabajo(crearTrabajoEnCurso({ id: 3 }), 'FINALIZADO', null));
    expect(metrics.totalLoaded()).toBe(2);
    state.updateFilters({ archiveStatus: 'ARCHIVED' });
    expect(metrics.totalApproved()).toBe(1);
  });
});
