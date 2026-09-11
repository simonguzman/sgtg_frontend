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

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown' y 'never') ──

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
  // Extraemos el tipo exacto de 'state' de la interfaz para evitar usar 'never'
  state: 'FINALIZADO' as ThesisWork['state'],
  isArchived: true,
  preliminaryDraftData: createMockPreliminaryDraft(),
  ...overrides
} as ThesisWork);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ArchivedThesisWorksTabService', () => {
  let service: ArchivedThesisWorksTabService;

  // 🔹 REFACTOR: Tipado estricto de dependencias
  let mockThesisWorkService: { allThesisWorks: WritableSignal<ThesisWork[]> };
  let mockUserService: { getAuthorsNames: jest.Mock<string, [User[] | undefined]> };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para mantener limpia la terminal
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
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
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
      // Usamos el anidamiento limpio de los factories para evitar el DeepPartialMock
      const activeWork = createMockThesisWork({
        thesisWorkId: 'tw-active-1',
        isArchived: false,
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-123' })] })
        })
      });

      const archivedWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        isArchived: true,
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-123' })] })
        })
      });

      mockThesisWorkService.allThesisWorks.set([activeWork, archivedWork]);

      const context = createContext('user-123'); // Acceso global es false
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('tw-arch-1');
    });

    it('debería retornar TODOS los trabajos archivados si el contexto tiene acceso global', () => {
      const workPropio = createMockThesisWork({
        thesisWorkId: 'tw-arch-1',
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-admin' })] })
        })
      });
      const workAjeno = createMockThesisWork({
        thesisWorkId: 'tw-arch-2',
        preliminaryDraftData: createMockPreliminaryDraft({
          proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-other' })] })
        })
      });

      mockThesisWorkService.allThesisWorks.set([workPropio, workAjeno]);

      const context = createContext('user-admin', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
    });

    it('debería mapear correctamente las columnas y procesar la fecha máxima de entrega dinámicamente', () => {
      const fullWork = createMockThesisWork({
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

      const emptyWork = createMockThesisWork({
        thesisWorkId: 'tw-arch-3',
        state: 'CANCELADO' as ThesisWork['state'],
        preliminaryDraftData: createMockPreliminaryDraft({
          maximumDeliveryDate: undefined,
          proposalData: createMockProposal({
            title: undefined,
            modality: undefined,
            description: undefined,
            authors: [],
            director: createMockUser({ id: 'user-123' }) // <-- FIX: Le damos acceso siendo el director para que no sea filtrada
          })
        })
      });

      mockThesisWorkService.allThesisWorks.set([fullWork, emptyWork]);

      // Simulamos que para el trabajo vacío, getAuthorsNames retorne falso/vacío
      mockUserService.getAuthorsNames.mockImplementation((authors) => {
        return authors && authors.length > 0 ? 'Autores Mockeados' : '';
      });

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificación del caso feliz (Full Work)
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'tw-arch-1',
        title: 'Sistema de Gestión Tesis',
        modality: Modality.TI,
        authors: 'Autores Mockeados',
        description: 'Descripción del trabajo de grado',
        state: 'FINALIZADO',
        allowedActions: ARCHIVED_ALLOWED_ACTIONS,
      }));

      // Comprobamos la generación del string para la fecha formateada
      expect(typeof data[0]['maxDeliveryDate']).toBe('string');
      expect(data[0]['maxDeliveryDate']).not.toBe('Sin fecha límite');

      // Verificación de Fallbacks (Tu Fix trabajando de fondo)
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'tw-arch-3',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción',
        maxDeliveryDate: 'Sin fecha límite', // Test del Fallback de Fecha
      }));
    });
  });
});
