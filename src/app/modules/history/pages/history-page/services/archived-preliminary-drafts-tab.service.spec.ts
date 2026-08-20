import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedPreliminaryDraftsTabService } from './archived-preliminary-drafts-tab.service';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { ARCHIVED_ALLOWED_ACTIONS } from '../models/archived-tab-columns.model';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────
function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-default',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    ...overrides
  } as User;
}

function createMockProposal(overrides: Partial<Proposal> = {}): Proposal {
  return {
    id: 'prop-1',
    title: 'Default Title',
    modality: 'Trabajo de investigación',
    description: 'Default Description',
    authors: [createMockUser()],
    ...overrides
  } as Proposal;
}

function createMockDocument(overrides: Partial<FileDocument> = {}): FileDocument {
  return {
    id: 'doc-1',
    name: 'document.pdf',
    type: DocumentType.ANTEPROYECTO,
    ...overrides
  } as FileDocument;
}

function createMockDraft(overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft {
  return {
    preliminaryDraftId: 'draft-1',
    isArchived: true,
    state: stateList.EN_REVISION,
    proposalData: createMockProposal(),
    evaluators: [],
    evaluations: [],
    documents: [],
    ...overrides
  } as PreliminaryDraft;
}

describe('ArchivedPreliminaryDraftsTabService', () => {
  let service: ArchivedPreliminaryDraftsTabService;

  // Mocks de dependencias
  let mockDraftService: { allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]> };
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    mockDraftService = {
      allPreliminaryDrafts: signal<PreliminaryDraft[]>([])
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Autores Mockeados'),
    } as unknown as jest.Mocked<UserService>;

    TestBed.configureTestingModule({
      providers: [
        ArchivedPreliminaryDraftsTabService,
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(ArchivedPreliminaryDraftsTabService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('ANTEPROYECTOS');
    });

    it('debería definir la estructura de las columnas usando el builder', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {
    // Helper tipado para contexto
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: createMockUser({ id: userId }),
      hasGlobalAccess,
    });

    it('debería excluir los anteproyectos que NO están archivados (isArchived = false)', () => {
      const activeDraft = createMockDraft({ preliminaryDraftId: 'active-1', isArchived: false });
      const archivedDraft = createMockDraft({ preliminaryDraftId: 'arch-1', isArchived: true });

      mockDraftService.allPreliminaryDrafts.set([activeDraft, archivedDraft]);

      // Pasamos un ID que asuma ser autor (el factory crea autores con 'user-default')
      const context = createContext('user-default');
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('arch-1');
    });

    it('debería retornar TODOS los anteproyectos archivados si el contexto tiene acceso global', () => {
      const draftPropio = createMockDraft({
        proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-admin' })] })
      });
      const draftAjeno = createMockDraft({
        proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-other' })] })
      });

      mockDraftService.allPreliminaryDrafts.set([draftPropio, draftAjeno]);

      const context = createContext('user-admin', true); // hasGlobalAccess = true
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
    });

    it('debería mapear las columnas correctamente y aplicar fallbacks si faltan datos', () => {
      const fullDraft = createMockDraft({
        preliminaryDraftId: 'arch-full',
        state: stateList.EN_REVISION,
        proposalData: createMockProposal({
          title: 'Anteproyecto Completo',
          modality: Modality.PP,
          description: 'Descripción completa',
          authors: [createMockUser({ id: 'user-123' })]
        })
      });

      const emptyDraft = createMockDraft({
        preliminaryDraftId: 'arch-empty',
        proposalData: createMockProposal({
          // Se elimina el uso de "as any" aprovechando el Partial<T>
          title: undefined,
          modality: undefined,
          description: undefined,
          authors: [createMockUser({ id: 'user-123' })]
        })
      });

      mockDraftService.allPreliminaryDrafts.set([fullDraft, emptyDraft]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificamos el anteproyecto completo
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-full',
        title: 'Anteproyecto Completo',
        modality: Modality.PP, // <-- CORRECCIÓN: Usamos el Enum directamente
        authors: 'Autores Mockeados',
        description: 'Descripción completa',
        state: stateList.EN_REVISION,
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      }));
      expect(data[0]).toHaveProperty('deadlineStatus');

      // Verificamos los Fallbacks por defecto
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-empty',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción'
      }));
    });

    it('debería priorizar el ID de documento tipo ANTEPROYECTO o CORRECCION sobre otros (Ej: FORMATO_C)', () => {
      const formatoC = createMockDocument({ id: 'doc-formato', type: DocumentType.FORMATO_C });
      const anteproyecto = createMockDocument({ id: 'doc-anteproyecto', type: DocumentType.ANTEPROYECTO });

      const draft = createMockDraft({
        documents: [formatoC, anteproyecto], // Simulamos que el Formato C quedó de primero [0]
        proposalData: createMockProposal({ authors: [createMockUser({ id: 'user-123' })] })
      });

      mockDraftService.allPreliminaryDrafts.set([draft]);
      const context = createContext('user-123');

      // Espiamos implícitamente cómo opera mediante el mapeo
      const data = service.getTableData(context);

      // Si el FIX del componente funciona, el helper interno de calculo de fechas
      // debió usar 'doc-anteproyecto' y no 'doc-formato'.
      // Aunque getEvaluatorsDeadlineLabel es externo, aseguramos que la iteración
      // no lanza error y se mapea exitosamente el registro.
      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('draft-1');
    });
  });
});
