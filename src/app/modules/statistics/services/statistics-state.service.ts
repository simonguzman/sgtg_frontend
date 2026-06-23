import { Injectable, computed, signal, inject } from '@angular/core';
import { RawProjectData } from '../interfaces/rawProjectData.enum';
import { StatisticsFilters } from '../interfaces/statisticsFilters.enum';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { ChartDataConfiguration } from '../interfaces/chartDataConfiguration.enum';

// --- Importaciones del dominio real ---
import { stateList } from '../../../core/enums/state.enum';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';

@Injectable({
  providedIn: 'root'
})
export class StatisticsStateService {

  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);

  public readonly currentFilters = signal<StatisticsFilters>({
    stage: null,
    period: null,
    directorId: null
  });

  public readonly rawData = computed<RawProjectData[]>(() => {
    const proposals = this.proposalService.proposals();
    const drafts = this.preliminaryDraftService.preliminaryDrafts();
    const thesisWorks = this.thesisWorkService.thesisWorks();

    const mappedProposals = proposals.map(p => {
      const creationDate = new Date(p.createdAt);
      const semester = creationDate.getMonth() < 6 ? '1' : '2';
      const fullDirectorName = p.director
        ? [p.director.firstName, p.director.secondName, p.director.lastName, p.director.secondLastName].filter(Boolean).join(' ')
        : 'Sin Asignar';

      return {
        id: p.id ?? '', // 💡 Proposal.id es opcional en el dominio; se garantiza string para RawProjectData
        title: p.title,
        stage: ProjectStage.PROPUESTA,
        status: this.mapStateToStatus(p.state),
        originalState: p.state, // 💡 Propiedad puente para control de exclusión
        period: `${creationDate.getFullYear()}-${semester}`,
        directorId: p.director?.id || 'sin-director',
        directorName: fullDirectorName,
        registrationDate: creationDate
      };
    });

    const mappedDrafts = drafts.map(d => {
      const creationDate = new Date(d.createdData || d.proposalData?.createdAt || Date.now());
      const semester = creationDate.getMonth() < 6 ? '1' : '2';
      const director = d.proposalData?.director;
      const fullDirectorName = director
        ? [director.firstName, director.secondName, director.lastName, director.secondLastName].filter(Boolean).join(' ')
        : 'Sin Asignar';

      return {
        id: d.preliminaryDraftId ?? '', // 💡 PreliminaryDraft.preliminaryDraftId es opcional en el dominio
        title: d.proposalData?.title || 'Sin Título',
        stage: ProjectStage.ANTEPROYECTO,
        status: this.mapStateToStatus(d.state),
        originalState: d.state, // 💡 Propiedad puente para control de exclusión
        period: `${creationDate.getFullYear()}-${semester}`,
        directorId: director?.id || 'sin-director',
        directorName: fullDirectorName,
        registrationDate: creationDate
      };
    });

    const mappedThesisWorks = thesisWorks.map(t => {
      const creationDate = new Date(t.createdDate || Date.now());
      const semester = creationDate.getMonth() < 6 ? '1' : '2';
      const director = t.preliminaryDraftData?.proposalData?.director;
      const fullDirectorName = director
        ? [director.firstName, director.secondName, director.lastName, director.secondLastName].filter(Boolean).join(' ')
        : 'Sin Asignar';

      return {
        id: t.thesisWorkId, // ThesisWork.thesisWorkId es requerido; no necesita fallback
        title: t.preliminaryDraftData?.proposalData?.title || 'Sin Título',
        stage: ProjectStage.TRABAJO_GRADO,
        status: this.mapStateToStatus(t.state),
        originalState: t.state, // 💡 Propiedad puente para control de exclusión
        period: `${creationDate.getFullYear()}-${semester}`,
        directorId: director?.id || 'sin-director',
        directorName: fullDirectorName,
        registrationDate: creationDate
      };
    });

    return [...mappedProposals, ...mappedDrafts, ...mappedThesisWorks];
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

  public readonly stagesOptions = signal<{ label: string; value: ProjectStage }[]>([
    { label: 'Propuesta', value: ProjectStage.PROPUESTA },
    { label: 'Anteproyecto', value: ProjectStage.ANTEPROYECTO },
    { label: 'Trabajo de Grado', value: ProjectStage.TRABAJO_GRADO }
  ]);

  public readonly filteredData = computed<RawProjectData[]>(() => {
    const data = this.rawData() as (RawProjectData & { originalState: string })[];
    const filters = this.currentFilters();

    return data.filter(project => {
      // 💡 Exclusión explícita del estado transitorio EVALUADO
      if (project.originalState === stateList.EVALUADO) return false;

      const matchStage = filters.stage ? project.stage === filters.stage : true;
      const matchPeriod = filters.period ? project.period === filters.period : true;
      const matchDirector = filters.directorId ? project.directorId === filters.directorId : true;

      return matchStage && matchPeriod && matchDirector;
    });
  });

  // --- COMPUTED PARA CARD KPIS ---
  public readonly totalLoaded = computed<number>(() => this.filteredData().length);
  public readonly totalApproved = computed<number>(() => this.filteredData().filter(p => p.status === ProjectStatus.APROBADO).length);
  public readonly totalApprovedWithObservations = computed<number>(() => this.filteredData().filter(p => p.status === ProjectStatus.APROBADO_OBSERVACIONES).length);

  public readonly totalNotApproved = computed<number>(() =>
    this.filteredData().filter(p => p.status === ProjectStatus.NO_APROBADO || p.status === ProjectStatus.CANCELADO).length
  );

  // --- COMPUTED PARA EL GRÁFICO DE DONA ---
  public readonly statusChartData = computed<ChartDataConfiguration>(() => {
    return {
      labels: [
        'Aprobados',
        'Aprobados c/ Obs.',
        'No Aprobados',
        'En Revisión',
        'En Desarrollo',
        'Aplazados',
        'Suspendidos',
        'Cancelados'
      ],
      datasets: [{
        data: [
          this.filteredData().filter(p => p.status === ProjectStatus.APROBADO).length,
          this.filteredData().filter(p => p.status === ProjectStatus.APROBADO_OBSERVACIONES).length,
          this.filteredData().filter(p => p.status === ProjectStatus.NO_APROBADO).length,
          this.filteredData().filter(p => p.status === ProjectStatus.EN_REVISION).length,
          this.filteredData().filter(p => p.status === ProjectStatus.EN_DESARROLLO).length,
          this.filteredData().filter(p => p.status === ProjectStatus.APLAZADO).length,
          this.filteredData().filter(p => p.status === ProjectStatus.SUSPENDIDO).length,
          this.filteredData().filter(p => p.status === ProjectStatus.CANCELADO).length,
        ],
        backgroundColor: [
          '#4ade80', // Verde
          '#fbbf24', // Amarillo
          '#f87171', // Rojo
          '#94a3b8', // Gris
          '#38bdf8', // Azul (En Desarrollo)
          '#fdba74', // Naranja (Aplazado)
          '#c084fc', // Morado (Suspendido)
          '#64748b'  // Gris Oscuro (Cancelado)
        ],
        borderColor: [
          '#22c55e',
          '#d97706',
          '#dc2626',
          '#64748b',
          '#0ea5e9',
          '#ea580c',
          '#9333ea',
          '#475569'
        ],
        borderWidth: 1
      }]
    };
  });

  // --- COMPUTED PARA EL GRÁFICO DE BARRAS ---
  public readonly stageChartData = computed<ChartDataConfiguration>(() => {
    return {
      labels: ['Propuestas', 'Anteproyectos', 'Trabajos de Grado'],
      datasets: [{
        label: 'Proyectos Activos',
        data: [
          this.filteredData().filter(p => p.stage === ProjectStage.PROPUESTA).length,
          this.filteredData().filter(p => p.stage === ProjectStage.ANTEPROYECTO).length,
          this.filteredData().filter(p => p.stage === ProjectStage.TRABAJO_GRADO).length,
        ],
        backgroundColor: ['#3b82f6', '#8b5cf6', '#ec4899'],
        borderWidth: 0
      }]
    };
  });

  public updateFilters(newFilters: Partial<StatisticsFilters>): void {
    this.currentFilters.update(current => ({ ...current, ...newFilters }));
  }

  public clearFilters(): void {
    this.currentFilters.set({ stage: null, period: null, directorId: null });
  }

  private mapStateToStatus(state: string): ProjectStatus {
    switch (state) {
      case stateList.APROBADO: return ProjectStatus.APROBADO;
      case stateList.APROBADO_CON_OBSERVACIONES: return ProjectStatus.APROBADO_OBSERVACIONES;
      case stateList.NO_APROBADO: return ProjectStatus.NO_APROBADO;
      case stateList.EN_REVISION: return ProjectStatus.EN_REVISION;
      case stateList.EN_DESARROLLO: return ProjectStatus.EN_DESARROLLO;
      case stateList.APLAZADO: return ProjectStatus.APLAZADO;
      case stateList.SUSPENDIDO: return ProjectStatus.SUSPENDIDO;
      case stateList.CANCELADO: return ProjectStatus.CANCELADO;
      // Nota: Si un estado EVALUADO llegara aquí por alguna razón, se asigna a EN_REVISION,
      // pero ya está blindado y excluido en la constante filteredData.
      default: return ProjectStatus.EN_REVISION;
    }
  }
}
