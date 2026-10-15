import { Injectable, computed, signal, inject } from '@angular/core';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { estaCerrado } from '../../../core/mappers/trabajo-grado.mapper';
import { resultadoDeCierre } from '../../history/helpers/archived-work.helper';
import { mapStateToProjectStatus } from '../helpers/project-status.helper';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { STAGE_OPTIONS } from '../models/statistics-options.model';

@Injectable({ providedIn: 'root' })
export class StatisticsStateService {
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);
  private readonly mapper = inject(ProjectDataMapperService);

  public readonly currentFilters = signal<StatisticsFilters>({
    stage: null,
    period: null,
    directorId: null,
    archiveStatus: 'ACTIVE',
    // ← NUEVO: 'ALL' es el valor neutro. No se usa null aquí porque null
    // ya significa "sin restricción" en el resto de filtros, y este
    // necesita distinguir 3 casos reales (en plazo / con retraso / sin
    // evaluar) además del "sin filtro".
    deadlineFilter: 'ALL'
  });

  /**
   * Un registro por trabajo de grado, en la etapa más avanzada que alcanzó
   * (propuesta, anteproyecto o trabajo de grado). Un trabajo cerrado se cuenta
   * con su resultado final.
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
      if (!estaCerrado(trabajo)) return [dato];
      const resultado = resultadoDeCierre(trabajo);
      return [{ ...dato, originalState: resultado, status: mapStateToProjectStatus(resultado) }];
    });
  });

  public readonly periodsOptions = computed<string[]>(() => {
    const periods = new Set(this.rawData().map(d => d.period));
    return Array.from(periods).sort((a, b) => b.localeCompare(a));
  });

  public readonly directorsOptions = computed<{ id: string; name: string }[]>(() => {
    const map = new Map<string, string>();
    this.rawData().forEach((d) => {
      if (d.directorId && d.directorId !== 'sin-director') {
        map.set(d.directorId, d.directorName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  });

  public readonly stagesOptions = STAGE_OPTIONS;

  public readonly filteredData = computed<RawProjectData[]>(() => {
    const data = this.rawData();
    const filters = this.currentFilters();
    return data.filter(project => {
      const matchStage    = filters.stage ? project.stage === filters.stage : true;
      const matchPeriod   = filters.period ? project.period === filters.period : true;
      const matchDirector = filters.directorId ? project.directorId === filters.directorId : true;
      const matchArchive  = filters.archiveStatus === 'ALL' ? true :
                             filters.archiveStatus === 'ARCHIVED' ? project.isArchived :
                             !project.isArchived;
      // ← NUEVO: compone con matchArchive de forma independiente — por
      // eso el filtro funciona igual para proyectos activos, archivados,
      // o ambos a la vez (ALL + DELAYED, por ejemplo).
      const matchDeadline = filters.deadlineFilter === 'ALL' ? true :
                             filters.deadlineFilter === 'NOT_EVALUATED' ? project.deadlineStatus === null :
                             project.deadlineStatus === filters.deadlineFilter;
      return matchStage && matchPeriod && matchDirector && matchArchive && matchDeadline;
    });
  });

  public updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.currentFilters.update(current => ({ ...current, ...newFilters }));
  }

  public clearFilters(): void {
    this.currentFilters.set({ stage: null, period: null, directorId: null, archiveStatus: 'ACTIVE', deadlineFilter: 'ALL' });
  }
}
