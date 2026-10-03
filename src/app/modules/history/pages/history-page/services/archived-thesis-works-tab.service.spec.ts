import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { ArchivedThesisWorksTabService } from './archived-thesis-works-tab.service';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { ARCHIVED_ALLOWED_ACTIONS } from '../models/archived-tab-columns.model';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { stateList } from '../../../../../core/enums/state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Default Title',
  modality: Modality.TI,
  description: 'Default Description',
  state: stateList.APROBADO,
  director: createMockUser(),
  authors: [createMockUser()],
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  isArchived: false,
  state: stateList.APROBADO,
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  documents: [],
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'tw-1',
  state: 'FINALIZADO' as ThesisWork['state'],
  isArchived: true,
  preliminaryDraftData: createMockPreliminaryDraft(),
  ...overrides
} as ThesisWork);

describe('ArchivedThesisWorksTabService', () => {
  let service: ArchivedThesisWorksTabService;
  let mockThesisWorkService: { allThesisWorks: WritableSignal<ThesisWork[]> };
  let mockUserService: { getAuthorsNames: jest.Mock<string, [User[] | undefined]> };

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockThesisWorkService = {
      allThesisWorks: signal<ThesisWork[]>([])
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Autores Mockeados')
    };

    TestBed.configureTestingModule({
      providers: [
        ArchivedThesisWorksTabService,
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(ArchivedThesisWorksTabService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('TRABAJOS');
    });

    it('debería definir la estructura de las columnas usando el builder', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: createMockUser({ id: userId }),
      hasGlobalAccess,
    });

    it('debería excluir los trabajos de grado que NO están archivados (isArchived = false)', () => {
      const activeThesisWork = createMockThesisWork({
        thesisWorkId: 'tw-active-1',
        isArchived: false,
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-123' })] })
        })
      });
      const archivedThesisWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        isArchived: true,
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-123' })] })
        })
      });
      mockThesisWorkService.allThesisWorks.set([activeThesisWork, archivedThesisWork]);
      const context = createContext('user-123');
      const data = service.getTableData(context);
      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('tw-arch-1');
    });

    it('debería retornar TODOS los trabajos archivados si el contexto tiene acceso global', () => {
      const thesisWorkPropio = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-admin' })] })
        })
      });
      const thesisWorkAjeno = createMockThesisWork({
        thesisWorkId: 'tw-arch-2',
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-other' })] })
        })
      });
      mockThesisWorkService.allThesisWorks.set([thesisWorkPropio, thesisWorkAjeno]);
      const context = createContext('user-admin', true);
      const data = service.getTableData(context);
      expect(data).toHaveLength(2);
    });

    it('debería mapear correctamente las columnas y procesar la fecha máxima de entrega dinámicamente', () => {
      const fullThesisWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        state: 'FINALIZADO' as ThesisWork['state'],
        preliminaryDraftData: createMockPreliminaryDraft({
          maximumDeliveryDate: new Date('2026-12-31T10:00:00'),
          proposalData: createMockProposal({
            title: 'Sistema de Gestión Tesis',
            modality: Modality.TI,
            description: 'Descripción del trabajo de grado',
            authors: [createMockUser({ id: 'user-123' })]
          })
        })
      });

      const emptyThesisWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-3',
        state: 'CANCELADO' as ThesisWork['state'],
        preliminaryDraftData: createMockPreliminaryDraft({
          maximumDeliveryDate: undefined,
          proposalData: createMockProposal({
            title: undefined,
            modality: undefined,
            description: undefined,
            authors: [],
            director: createMockUser({ id: 'user-123' })
          })
        })
      });
      mockThesisWorkService.allThesisWorks.set([fullThesisWork, emptyThesisWork]);
      mockUserService.getAuthorsNames.mockImplementation((authors) => {
        return authors && authors.length > 0 ? 'Autores Mockeados' : '';
      });
      const context = createContext('user-123');
      const data = service.getTableData(context);
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'tw-arch-1',
        title: 'Sistema de Gestión Tesis',
        modality: Modality.TI,
        authors: 'Autores Mockeados',
        description: 'Descripción del trabajo de grado',
        state: 'FINALIZADO',
        allowedActions: ARCHIVED_ALLOWED_ACTIONS,
      }));
      expect(typeof data[0]['maxDeliveryDate']).toBe('string');
      expect(data[0]['maxDeliveryDate']).not.toBe('Sin fecha límite');
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'tw-arch-3',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción',
        maxDeliveryDate: 'Sin fecha límite',
      }));
    });
  });
});
