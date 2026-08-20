import { Injectable, computed, signal, inject } from '@angular/core';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { StatisticsFilters } from '../interfaces/statisticsFilters.interface';
import { stateList } from '../../../core/enums/state.enum';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { ProjectDataMapperService } from './project-data-mapper.service';
import { STAGE_OPTIONS } from '../models/statistics-options.model';

@Injectable({ providedIn: 'root' })
export class StatisticsStateService {
  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
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

  public readonly rawData = computed<RawProjectData[]>(() => {
    const proposals   = this.proposalService.allProposals().map(p => this.mapper.mapProposal(p));
    const drafts       = this.preliminaryDraftService.allPreliminaryDrafts().map(d => this.mapper.mapPreliminaryDraft(d));
    const thesisWorks  = this.thesisWorkService.allThesisWorks().map(t => this.mapper.mapThesisWork(t));
    return [...proposals, ...drafts, ...thesisWorks];
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
      if (project.originalState === stateList.EVALUADO) return false;
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
