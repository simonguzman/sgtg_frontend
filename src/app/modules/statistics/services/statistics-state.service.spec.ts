import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { StatisticsStateService } from './statistics-state.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { stateList } from '../../../core/enums/state.enum';
import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

// --- Interfaces reales del dominio (fuente única de verdad para los mocks) ---
import { Proposal, Modality } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User, IdentificationType, UserState } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/models/user-role';

/* ============================================================================
   FACTORIES DE DATOS DE PRUEBA
   Propósito: Construir objetos 100% coherentes con las interfaces reales del
   dominio (Proposal, PreliminaryDraft, ThesisWork, User). Cada factory rellena
   todos los campos OBLIGATORIOS con valores por defecto razonables, y permite
   sobreescribir solo lo relevante para cada caso de prueba mediante Partial<T>.
   Esto evita que el spec compile con datos incompletos o con tipos relajados
   (ej: createdAt como string) que no representan lo que el servicio real
   recibirá en producción.
   ============================================================================ */

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-default',
    idType: IdentificationType.CC,
    idNumber: 1000000,
    firstName: 'Nombre',
    secondName: '',
    lastName: 'Apellido',
    secondLastName: '',
    codeNumber: 100000,
    roles: [] as UserRoleType[],
    email: 'usuario.prueba@unicauca.edu.co',
    password: 'placeholder',
    state: UserState.active,
    ...overrides
  };
}

function createMockProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'proposal-default',
    title: 'Propuesta de prueba',
    description: 'Descripción de prueba',
    modality: Modality.TI,
    authors: [createMockUser({ id: 'author-default' })],
    director: createMockUser({ id: 'dir-default' }),
    state: stateList.EN_REVISION,
    createdAt: new Date('2026-01-01T00:00:00'),
    documents: [],
    evaluations: [],
    ...overrides
  };
}

function createMockPreliminaryDraft(overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft {
  return {
    preliminaryDraftId: 'draft-default',
    proposalId: 'proposal-default',
    proposalData: createMockProposal(),
    evaluations: [],
    documents: [],
    state: stateList.EN_DESARROLLO,
    createdData: new Date('2026-01-01T00:00:00'),
    ...overrides
  };
}

function createMockThesisWork(overrides: Partial<ThesisWork> = {}): ThesisWork {
  return {
    thesisWorkId: 'thesis-default',
    preliminaryDraftId: 'draft-default',
    preliminaryDraftData: createMockPreliminaryDraft(),
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date('2026-01-01T00:00:00'),
    ...overrides
  };
}

describe('Service: StatisticsStateService', () => {
  let service: StatisticsStateService;

  // Signals tipados contra las interfaces reales del dominio
  let proposalsSignal: WritableSignal<Proposal[]>;
  let draftsSignal: WritableSignal<PreliminaryDraft[]>;
  let thesisSignal: WritableSignal<ThesisWork[]>;

  const SYSTEM_DATE = new Date('2026-06-22T10:00:00');

  // Director reutilizable, construido con la factory para garantizar coherencia
  const mockDirector: User = createMockUser({
    id: 'dir-1',
    firstName: 'Juan',
    lastName: 'Pérez'
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(SYSTEM_DATE.getTime());

    proposalsSignal = signal([]);
    draftsSignal = signal([]);
    thesisSignal = signal([]);

    TestBed.configureTestingModule({
      providers: [
        StatisticsStateService,
        { provide: ProposalService, useValue: { proposals: proposalsSignal } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: draftsSignal } },
        { provide: ThesisWorkService, useValue: { thesisWorks: thesisSignal } }
      ]
    });

    service = TestBed.inject(StatisticsStateService);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('Debe crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('Mapeo de Datos (rawData)', () => {
    it('Debe mapear correctamente las propuestas, anteproyectos y trabajos de grado', () => {
      proposalsSignal.set([
        createMockProposal({
          id: 'prop-1',
          title: 'Propuesta 1',
          state: stateList.EN_REVISION,
          createdAt: new Date('2026-02-15T00:00:00'), // Semestre 1
          director: mockDirector
        })
      ]);

      draftsSignal.set([
        createMockPreliminaryDraft({
          preliminaryDraftId: 'draft-1',
          state: stateList.EN_DESARROLLO,
          createdData: new Date('2026-08-10T00:00:00'), // Semestre 2
          proposalData: createMockProposal({ title: 'Anteproyecto 1', director: mockDirector })
        })
      ]);

      const raw = service.rawData();
      expect(raw.length).toBe(2);

      // Verificaciones de Propuesta
      expect(raw[0].id).toBe('prop-1');
      expect(raw[0].stage).toBe(ProjectStage.PROPUESTA);
      expect(raw[0].period).toBe('2026-1');
      expect(raw[0].directorName).toBe('Juan Pérez');

      // Verificaciones de Anteproyecto
      expect(raw[1].id).toBe('draft-1');
      expect(raw[1].stage).toBe(ProjectStage.ANTEPROYECTO);
      expect(raw[1].period).toBe('2026-2');
    });

    it('Debe asignar "Sin Asignar" como directorName cuando no hay director', () => {
      proposalsSignal.set([
        createMockProposal({
          id: 'prop-sin-director',
          title: 'Propuesta sin director',
          director: undefined as unknown as User
        })
      ]);

      const raw = service.rawData();
      expect(raw[0].directorName).toBe('Sin Asignar');
      expect(raw[0].directorId).toBe('sin-director');
    });
  });

  describe('Filtrado y Exclusión de Estados', () => {
    it('Debe excluir los proyectos con estado EVALUADO de filteredData', () => {
      thesisSignal.set([
        createMockThesisWork({
          thesisWorkId: 'thesis-1',
          state: stateList.EVALUADO, // Este debe ser ignorado
          createdDate: new Date('2026-05-10T00:00:00')
        }),
        createMockThesisWork({
          thesisWorkId: 'thesis-2',
          state: stateList.APROBADO, // Este debe incluirse
          createdDate: new Date('2026-05-12T00:00:00')
        })
      ]);

      const filtered = service.filteredData();

      expect(service.rawData().length).toBe(2); // Ambos están en rawData
      expect(filtered.length).toBe(1); // Solo uno pasa el filtro
      expect(filtered[0].id).toBe('thesis-2');
    });

    it('Debe aplicar correctamente los filtros de etapa, periodo y director', () => {
      proposalsSignal.set([
        createMockProposal({
          id: '1', title: 'A', state: stateList.APROBADO,
          createdAt: new Date('2025-03-01T00:00:00'),
          director: createMockUser({ id: 'd1', firstName: 'D1', lastName: '' })
        }),
        createMockProposal({
          id: '2', title: 'B', state: stateList.EN_REVISION,
          createdAt: new Date('2026-03-01T00:00:00'),
          director: createMockUser({ id: 'd2', firstName: 'D2', lastName: '' })
        })
      ]);

      // Filtrar por periodo
      service.updateFilters({ period: '2025-1' });
      expect(service.filteredData().length).toBe(1);
      expect(service.filteredData()[0].id).toBe('1');

      // Limpiar y filtrar por director
      service.clearFilters();
      service.updateFilters({ directorId: 'd2' });
      expect(service.filteredData().length).toBe(1);
      expect(service.filteredData()[0].id).toBe('2');
    });
  });

  describe('Cálculo de KPIs', () => {
    beforeEach(() => {
      proposalsSignal.set([
        createMockProposal({ id: 'p1', title: 'P1', state: stateList.APROBADO, createdAt: new Date('2026-01-01T00:00:00') }),
        createMockProposal({ id: 'p2', title: 'P2', state: stateList.NO_APROBADO, createdAt: new Date('2026-01-01T00:00:00') }),
        createMockProposal({ id: 'p3', title: 'P3', state: stateList.CANCELADO, createdAt: new Date('2026-01-01T00:00:00') }),
        createMockProposal({ id: 'p4', title: 'P4', state: stateList.APROBADO_CON_OBSERVACIONES, createdAt: new Date('2026-01-01T00:00:00') })
      ]);
    });

    it('Debe calcular correctamente el totalLoaded', () => {
      expect(service.totalLoaded()).toBe(4);
    });

    it('Debe calcular correctamente el totalApproved', () => {
      expect(service.totalApproved()).toBe(1);
    });

    it('Debe calcular correctamente el totalApprovedWithObservations', () => {
      expect(service.totalApprovedWithObservations()).toBe(1);
    });

    it('Debe sumar NO_APROBADO y CANCELADO en totalNotApproved', () => {
      expect(service.totalNotApproved()).toBe(2); // p2 (NO_APROBADO) + p3 (CANCELADO)
    });
  });

  describe('Configuración de Gráficos (ChartData)', () => {
    it('Debe poblar los datasets del gráfico de Dona (statusChartData) basándose en filteredData', () => {
      proposalsSignal.set([
        createMockProposal({ id: 'p1', title: 'P1', state: stateList.APROBADO, createdAt: new Date('2026-01-01T00:00:00') }),
        createMockProposal({ id: 'p2', title: 'P2', state: stateList.EN_DESARROLLO, createdAt: new Date('2026-01-01T00:00:00') })
      ]);

      const chartData = service.statusChartData();
      const dataset = chartData.datasets[0].data;

      // Índices basados en el orden de labels:
      // 0: Aprobados, 1: Aprobados c/ Obs., 2: No Aprobados, 3: En Revisión, 4: En Desarrollo...
      expect(dataset[0]).toBe(1); // 1 Aprobado
      expect(dataset[4]).toBe(1); // 1 En Desarrollo
      expect(dataset[2]).toBe(0); // 0 No Aprobados
    });

    it('Debe poblar los datasets del gráfico de Barras (stageChartData) agrupando por etapa', () => {
      proposalsSignal.set([
        createMockProposal({ id: 'p1', title: 'P1', state: stateList.APROBADO, createdAt: new Date('2026-01-01T00:00:00') })
      ]);
      draftsSignal.set([
        createMockPreliminaryDraft({ preliminaryDraftId: 'd1', state: stateList.EN_DESARROLLO, createdData: new Date('2026-01-01T00:00:00') })
      ]);
      // 0 Trabajos de grado

      const chartData = service.stageChartData();
      const dataset = chartData.datasets[0].data;

      // Orden: Propuestas, Anteproyectos, Trabajos de Grado
      expect(dataset[0]).toBe(1);
      expect(dataset[1]).toBe(1);
      expect(dataset[2]).toBe(0);
    });
  });

  describe('Opciones de filtro (periodsOptions / directorsOptions)', () => {
    it('Debe construir directorsOptions sin duplicados y sin incluir "sin-director"', () => {
      proposalsSignal.set([
        createMockProposal({ id: 'p1', director: mockDirector }),
        createMockProposal({ id: 'p2', director: mockDirector }), // mismo director, no debe duplicarse
        createMockProposal({ id: 'p3', director: undefined as unknown as User }) // sin director
      ]);

      const options = service.directorsOptions();

      expect(options.length).toBe(1);
      expect(options[0]).toEqual({ id: 'dir-1', name: 'Juan Pérez' });
    });

    it('Debe ordenar periodsOptions de forma descendente', () => {
      proposalsSignal.set([
        createMockProposal({ id: 'p1', createdAt: new Date('2024-01-01T00:00:00') }),
        createMockProposal({ id: 'p2', createdAt: new Date('2026-01-01T00:00:00') })
      ]);

      expect(service.periodsOptions()).toEqual(['2026-1', '2024-1']);
    });
  });
});
