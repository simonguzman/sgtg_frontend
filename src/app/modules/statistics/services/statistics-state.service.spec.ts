import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { StatisticsStateService } from '../../statistics/services/statistics-state.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { ProjectDataMapperService } from '../../statistics/services/project-data-mapper.service';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { RawProjectData } from '../../statistics/interfaces/rawProjectData.interface';
import { StatisticsFilters } from '../../statistics/interfaces/statisticsFilters.interface';

import { ProjectStage } from '../../statistics/enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Default Title',
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  authors: [],
  evaluations: [],
  documents: [],
  isArchived: false,
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.APROBADO,
  isArchived: false,
  evaluators: [],
  evaluations: [],
  documents: [],
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-1',
  state: 'FINALIZADO' as ThesisWork['state'],
  isArchived: false,
  createdDate: new Date(),
  ...overrides
} as ThesisWork);

const createMockRawProjectData = (overrides: Partial<RawProjectData> = {}): RawProjectData => ({
  id: 'raw-1',
  title: 'Proyecto Mock',
  stage: ProjectStage.PROPUESTA,
  status: ProjectStatus.EN_DESARROLLO,
  originalState: stateList.EN_REVISION,
  period: '2026-1',
  directorId: 'usr-1',
  directorName: 'Director Mock',
  registrationDate: new Date(),
  isArchived: false,
  deadlineStatus: null,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('StatisticsStateService', () => {
  let service: StatisticsStateService;

  // Signals reactivos con tipado estricto
  let mockProposalsSignal: WritableSignal<Proposal[]>;
  let mockDraftsSignal: WritableSignal<PreliminaryDraft[]>;
  let mockThesisSignal: WritableSignal<ThesisWork[]>;

  // Mapper estricto sin retornos inseguros
  let mockMapper: {
    mapProposal: jest.Mock<RawProjectData, [Proposal]>;
    mapPreliminaryDraft: jest.Mock<RawProjectData, [PreliminaryDraft]>;
    mapThesisWork: jest.Mock<RawProjectData, [ThesisWork]>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockProposalsSignal = signal<Proposal[]>([]);
    mockDraftsSignal = signal<PreliminaryDraft[]>([]);
    mockThesisSignal = signal<ThesisWork[]>([]);

    const mockProposalService: Partial<ProposalService> = {
      allProposals: mockProposalsSignal,
    };
    const mockPreliminaryDraftService: Partial<PreliminaryDraftService> = {
      allPreliminaryDrafts: mockDraftsSignal,
    };
    const mockThesisWorkService: Partial<ThesisWorkService> = {
      allThesisWorks: mockThesisSignal,
    };

    mockMapper = {
      mapProposal: jest.fn(),
      mapPreliminaryDraft: jest.fn(),
      mapThesisWork: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        StatisticsStateService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: ProjectDataMapperService, useValue: mockMapper },
      ],
    });

    service = TestBed.inject(StatisticsStateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Estado inicial y gestión de filtros', () => {
    it('debe inicializar con los filtros por defecto (incluyendo deadlineFilter)', () => {
      const expectedInitialState: StatisticsFilters = {
        stage: null,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      };

      expect(service.currentFilters()).toEqual(expectedInitialState);
    });

    it('debe actualizar los filtros parcialmente manteniendo el resto', () => {
      const updatePayload: Partial<StatisticsFilters> = {
        stage: ProjectStage.PROPUESTA,
      };

      service.updateFilters(updatePayload);

      expect(service.currentFilters()).toEqual({
        stage: ProjectStage.PROPUESTA,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      });
    });

    it('debe limpiar los filtros volviendo al estado por defecto', () => {
      service.updateFilters({
        period: '2025-1',
        archiveStatus: 'ALL',
        deadlineFilter: EvaluationDeadlineStatus.DELAYED,
      });

      service.clearFilters();

      expect(service.currentFilters()).toEqual({
        stage: null,
        period: null,
        directorId: null,
        archiveStatus: 'ACTIVE',
        deadlineFilter: 'ALL',
      });
    });
  });

  describe('Computeds de Datos base y Opciones', () => {
    // 🔹 REFACTOR: Generamos los RawProjectData estrictamente
    const rawProject1 = createMockRawProjectData({
      id: '1',
      period: '2025-1',
      directorId: 'dir-1',
      directorName: 'Juan Pérez',
    });

    const rawProject2 = createMockRawProjectData({
      id: '2',
      period: '2026-1',
      directorId: 'dir-2',
      directorName: 'Ana Gómez',
    });

    const rawProject3 = createMockRawProjectData({
      id: '3',
      period: '2025-1',
      directorId: 'dir-1',
      directorName: 'Juan Pérez',
    });

    const rawProjectNoDirector = createMockRawProjectData({
      id: '4',
      period: '2024-2',
      directorId: 'sin-director',
      directorName: 'Sin Asignar',
    });

    beforeEach(() => {
      // Configuramos entidades genuinas para inyectarlas en los Signals
      const prop1 = createMockProposal({ id: '1' });
      const draft2 = createMockPreliminaryDraft({ preliminaryDraftId: '2' });
      const draftNoDir = createMockPreliminaryDraft({ preliminaryDraftId: '4' });
      const thesis3 = createMockThesisWork({ thesisWorkId: '3' });

      // Instruimos al mockMapper para devolver el Raw adecuado según el ID que le llegue
      mockMapper.mapProposal.mockImplementation(p => p.id === '1' ? rawProject1 : createMockRawProjectData());
      mockMapper.mapPreliminaryDraft.mockImplementation(d => {
        if (d.preliminaryDraftId === '2') return rawProject2;
        if (d.preliminaryDraftId === '4') return rawProjectNoDirector;
        return createMockRawProjectData();
      });
      mockMapper.mapThesisWork.mockImplementation(t => t.thesisWorkId === '3' ? rawProject3 : createMockRawProjectData());

      // Alimentamos los signals
      mockProposalsSignal.set([prop1]);
      mockDraftsSignal.set([draft2, draftNoDir]);
      mockThesisSignal.set([thesis3]);
    });

    it('rawData: debe combinar y mapear los datos de los 3 servicios', () => {
      const data: RawProjectData[] = service.rawData();
      expect(data).toHaveLength(4);
      expect(mockMapper.mapProposal).toHaveBeenCalledTimes(1);
      expect(mockMapper.mapPreliminaryDraft).toHaveBeenCalledTimes(2);
      expect(mockMapper.mapThesisWork).toHaveBeenCalledTimes(1);
    });

    it('periodsOptions: debe extraer periodos únicos y ordenarlos descendentemente', () => {
      const periods: string[] = service.periodsOptions();
      expect(periods).toEqual(['2026-1', '2025-1', '2024-2']);
    });

    it('directorsOptions: debe extraer directores únicos ignorando "sin-director"', () => {
      const directors = service.directorsOptions();
      expect(directors).toHaveLength(2);
      expect(directors).toEqual([
        { id: 'dir-1', name: 'Juan Pérez' },
        { id: 'dir-2', name: 'Ana Gómez' },
      ]);
    });
  });

  describe('filteredData (Lógica de filtrado)', () => {
    // 🔹 REFACTOR: Construimos la data resultante de forma limpia
    const activeRaw = createMockRawProjectData({
      id: 'p1',
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME,
    });

    const archivedRaw = createMockRawProjectData({
      id: 'p2',
      stage: ProjectStage.ANTEPROYECTO,
      period: '2025-2',
      directorId: 'd2',
      isArchived: true,
      deadlineStatus: EvaluationDeadlineStatus.DELAYED,
    });

    const unevaluatedRaw = createMockRawProjectData({
      id: 'p3',
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      isArchived: false,
      deadlineStatus: null,
    });

    const evaluatedRaw = createMockRawProjectData({
      id: 'p4',
      originalState: stateList.EVALUADO,
      stage: ProjectStage.PROPUESTA,
      period: '2026-1',
      directorId: 'd1',
      isArchived: false,
      deadlineStatus: EvaluationDeadlineStatus.ON_TIME,
    });

    beforeEach(() => {
      // Creamos 4 propuestas dummy que alimentarán el Signal principal
      const p1 = createMockProposal({ id: 'p1' });
      const p2 = createMockProposal({ id: 'p2' });
      const p3 = createMockProposal({ id: 'p3' });
      const p4 = createMockProposal({ id: 'p4' });

      // Enrutamos las respuestas del mapper según el ID
      mockMapper.mapProposal.mockImplementation(p => {
        if (p.id === 'p1') return activeRaw;
        if (p.id === 'p2') return archivedRaw;
        if (p.id === 'p3') return unevaluatedRaw;
        if (p.id === 'p4') return evaluatedRaw;
        return createMockRawProjectData();
      });

      mockProposalsSignal.set([p1, p2, p3, p4]);
    });

    it('debe excluir siempre proyectos cuyo originalState sea EVALUADO', () => {
      service.updateFilters({ archiveStatus: 'ALL', deadlineFilter: 'ALL' });
      const resultIds = service.filteredData().map((p) => p.id);

      expect(resultIds).not.toContain('p4');
    });

    it('debe filtrar correctamente por archiveStatus', () => {
      // Estado por defecto: 'ACTIVE'
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p3']);

      // Cambio a 'ARCHIVED'
      service.updateFilters({ archiveStatus: 'ARCHIVED' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p2']);

      // Cambio a 'ALL'
      service.updateFilters({ archiveStatus: 'ALL' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);
    });

    it('debe filtrar correctamente por deadlineFilter', () => {
      service.updateFilters({ archiveStatus: 'ALL' });

      // ALL
      service.updateFilters({ deadlineFilter: 'ALL' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1', 'p2', 'p3']);

      // NOT_EVALUATED (donde deadlineStatus es null)
      service.updateFilters({ deadlineFilter: 'NOT_EVALUATED' });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p3']);

      // ON_TIME
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.ON_TIME });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p1']);

      // DELAYED
      service.updateFilters({ deadlineFilter: EvaluationDeadlineStatus.DELAYED });
      expect(service.filteredData().map((p) => p.id)).toEqual(['p2']);
    });

    it('debe aplicar filtros combinados de etapa, periodo, director y estado de entrega', () => {
      service.updateFilters({
        archiveStatus: 'ALL',
        stage: ProjectStage.PROPUESTA,
        period: '2026-1',
        directorId: 'd1',
        deadlineFilter: EvaluationDeadlineStatus.ON_TIME,
      });

      expect(service.filteredData().map((p) => p.id)).toEqual(['p1']);
    });
  });
});
