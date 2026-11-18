import { Injectable, computed, signal, inject } from '@angular/core';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { DEFAULT_STATISTICS_FILTERS, StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { estaCerrado } from '../../../core/mappers/trabajo-grado.mapper';
import { resultadoDeCierre } from '../../history/helpers/archived-work.helper';
import { mapStateToProjectStatus } from '../helpers/project-status.helper';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { STAGE_OPTIONS, statisticsScope } from '../models/statistics-options.model';
import { AuthStorageService } from '../../../core/services/auth/auth-storage.service';

/**
 * Datos y filtros de la página de estadísticas: un registro por trabajo visible y los filtros aplicados sobre
 * ellos.
 */
@Injectable({ providedIn: 'root' })
export class StatisticsStateService {
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);
  private readonly mapper = inject(ProjectDataMapperService);
  private readonly authStorage = inject(AuthStorageService);

  /**
   * Por defecto, todos los trabajos (en proceso y cerrados). El filtro de plazo
   * usa 'ALL' como valor neutro y no null porque distingue tres casos (en plazo,
   * con retraso y sin evaluar).
   */
  public readonly currentFilters = signal<StatisticsFilters>({ ...DEFAULT_STATISTICS_FILTERS });

  /** Qué trabajos cuentan: los que el backend deja consultar a los roles del usuario */
  public readonly scope = computed(() => statisticsScope(this.authStorage.userRoles()));

  /**
   * Un registro por trabajo de grado, en la etapa más avanzada que alcanzó
   * (propuesta, anteproyecto o trabajo de grado). Un trabajo cerrado se cuenta
   * con su resultado final. La modalidad es la del trabajo y el programa, el del
 * primer estudiante (el de su Comité, que conceptúa la propuesta).
   */
  public readonly rawData = computed<RawProjectData[]>(() => {
    const propuestas = new Map(this.vistas.propuestas().map(p => [p.id, p]));
    const anteproyectos = new Map(this.vistas.anteproyectos().map(a => [a.preliminaryDraftId, a]));
    const trabajos = new Map(this.vistas.trabajosDeGrado().map(t => [t.thesisWorkId, t]));
    return this.store.trabajos().flatMap(trabajo => {
      const id = String(trabajo.id);
      const trabajoDeGrado = trabajos.get(id);
      const anteproyecto = anteproyectos.get(id);
      const propuesta = propuestas.get(id);
      const dato = trabajoDeGrado ? this.mapper.mapThesisWork(trabajoDeGrado)
        : anteproyecto ? this.mapper.mapPreliminaryDraft(anteproyecto)
        : propuesta ? this.mapper.mapProposal(propuesta) : null;
      if (!dato) return [];
      const delTrabajo: RawProjectData = {
        ...dato,
        modality: trabajo.modalidad === 'PRACTICA_PROFESIONAL' ? 'Práctica profesional' : 'Trabajo de investigación',
        program: trabajo.estudiantes[0]?.programa?.nombre ?? 'Sin programa'
      };
      if (!estaCerrado(trabajo)) return [delTrabajo];
      const resultado = resultadoDeCierre(trabajo);
      return [{ ...delTrabajo, originalState: resultado, status: mapStateToProjectStatus(resultado) }];
    });
  });

  /** Periodos académicos con trabajos, del más reciente al más antiguo. */
  public readonly periodsOptions = computed<string[]>(() => {
    const periods = new Set(this.rawData().map(d => d.period));
    return Array.from(periods).sort((a, b) => b.localeCompare(a));
  });

  /** Directores con trabajos. */
  public readonly directorsOptions = computed<{ id: string; name: string }[]>(() => {
    const map = new Map<string, string>();
    this.rawData().forEach((d) => {
      if (d.directorId && d.directorId !== 'sin-director') {
        map.set(d.directorId, d.directorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  });

  /** Modalidades con trabajos. */
  public readonly modalityOptions = computed<string[]>(() =>
    Array.from(new Set(this.rawData().map(d => d.modality))).sort((a, b) => a.localeCompare(b)));

  /** Programas con trabajos. */
  public readonly programOptions = computed<string[]>(() =>
    Array.from(new Set(this.rawData().map(d => d.program))).sort((a, b) => a.localeCompare(b)));

  /** Opciones del filtro de etapa. */
  public readonly stagesOptions = STAGE_OPTIONS;

  /** Trabajos que cumplen todos los filtros; el del plazo se combina con el de situación, así que sirve para trabajos en proceso, cerrados o ambos. */
  public readonly filteredData = computed<RawProjectData[]>(() => {
    const data = this.rawData();
    const filters = this.currentFilters();
    return data.filter(project => {
      const matchStage    = filters.stage ? project.stage === filters.stage : true;
      const matchPeriod   = filters.period ? project.period === filters.period : true;
      const matchDirector = filters.directorId ? project.directorId === filters.directorId : true;
      const matchModality = filters.modality ? project.modality === filters.modality : true;
      const matchProgram  = filters.program ? project.program === filters.program : true;
      const matchArchive  = filters.archiveStatus === 'ALL' ? true :
                             filters.archiveStatus === 'ARCHIVED' ? project.isArchived :
                             !project.isArchived;
      const matchDeadline = filters.deadlineFilter === 'ALL' ? true :
                             filters.deadlineFilter === 'NOT_EVALUATED' ? project.deadlineStatus === null :
                             project.deadlineStatus === filters.deadlineFilter;
      return matchStage && matchPeriod && matchDirector && matchModality && matchProgram && matchArchive
        && matchDeadline;
    });
  });

  /** Aplica los filtros indicados sobre los actuales. */
  public updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.currentFilters.update(current => ({ ...current, ...newFilters }));
  }

  /** Vuelve a los filtros por defecto. */
  public clearFilters(): void {
    this.currentFilters.set({ ...DEFAULT_STATISTICS_FILTERS });
  }
}
