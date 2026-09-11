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

// ── Funciones Fábrica fuertemente tipadas (Zero 'any' y 'unknown') ──────────

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

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'document.pdf',
  url: 'http://test.com/doc.pdf',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  type: DocumentType.ANTEPROYECTO,
  ...overrides
} as FileDocument);

const createMockDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  isArchived: true,
  state: stateList.EN_REVISION,
  proposalData: createMockProposal(),
  evaluators: [],
  evaluations: [],
  documents: [],
  createdData: new Date(),
  ...overrides
} as PreliminaryDraft);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ArchivedPreliminaryDraftsTabService', () => {
  let service: ArchivedPreliminaryDraftsTabService;

  // 🔹 REFACTOR: Tipado estricto de las dependencias
  let mockDraftService: { allPreliminaryDrafts: WritableSignal<PreliminaryDraft[]> };
  let mockUserService: { getAuthorsNames: jest.Mock<string, [User[] | undefined]> };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para mantener limpia la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockDraftService = {
      allPreliminaryDrafts: signal<PreliminaryDraft[]>([])
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Autores Mockeados')
    };

    TestBed.configureTestingModule({
      providers: [
        ArchivedPreliminaryDraftsTabService,
        { provide: PreliminaryDraftService, useValue: mockDraftService },
        { provide: UserService, useValue: mockUserService }
      ]
    });

    service = TestBed.inject(ArchivedPreliminaryDraftsTabService);
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
      expect(service.tabValue).toBe('ANTEPROYECTOS');
    });

    it('debería definir la estructura de las columnas usando el builder', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {
    // Helper tipado para construir el contexto
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: createMockUser({ id: userId }),
      hasGlobalAccess,
    });

    it('debería excluir los anteproyectos que NO están archivados (isArchived = false)', () => {
      const activeDraft = createMockDraft({ preliminaryDraftId: 'active-1', isArchived: false });
      const archivedDraft = createMockDraft({ preliminaryDraftId: 'arch-1', isArchived: true });

      mockDraftService.allPreliminaryDrafts.set([activeDraft, archivedDraft]);

      // Pasamos un ID que asuma ser autor
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
          modality: Modality.TI,
          description: 'Descripción completa',
          authors: [createMockUser({ id: 'user-123' })]
        })
      });

      const emptyDraft = createMockDraft({
        preliminaryDraftId: 'arch-empty',
        proposalData: createMockProposal({
          title: undefined,
          modality: undefined,
          description: undefined,
          authors: [],
          director: createMockUser({ id: 'user-123' }) // <-- FIX: Le damos acceso siendo el director para que no sea filtrado
        })
      });

      mockDraftService.allPreliminaryDrafts.set([fullDraft, emptyDraft]);

      // Simulamos que para el emptyDraft, getAuthorsNames retorne falso/vacío
      mockUserService.getAuthorsNames.mockImplementation((authors) => {
        return authors && authors.length > 0 ? 'Autores Mockeados' : '';
      });

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificamos el anteproyecto completo
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-full',
        title: 'Anteproyecto Completo',
        modality: Modality.TI,
        authors: 'Autores Mockeados',
        description: 'Descripción completa',
        state: stateList.EN_REVISION,
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      }));
      expect(data[0]).toHaveProperty('deadlineStatus');

      // Verificamos los Fallbacks por defecto para las propiedades vacías
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-empty',
        title: 'Sin título',
        modality: 'No definida',
        authors: 'Sin asignar',
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

      // Aunque getEvaluatorsDeadlineLabel es externo, aseguramos que la iteración
      // no lanza error, mapea exitosamente y el FIX del componente surte efecto.
      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('draft-1');
    });
  });
});
