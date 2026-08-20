import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedPreliminaryDraftsTabService } from '../../history-page/services/archived-preliminary-drafts-tab.service';
import { PreliminaryDraftService } from '../../../../preliminary-draft/services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { PreliminaryDraft } from '../../../../preliminary-draft/interfaces/preliminary-draft.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

describe('ArchivedPreliminaryDraftsTabService', () => {
  let service: ArchivedPreliminaryDraftsTabService;

  // Mocks estrictos utilizando Partial en lugar de "any"
  let mockDraftService: Partial<PreliminaryDraftService>;
  let mockUserService: Partial<UserService>;

  // Signal para controlar reactivamente los datos falsos
  let mockAllDraftsSignal: WritableSignal<PreliminaryDraft[]>;

  beforeEach(() => {
    mockAllDraftsSignal = signal([]);

    mockDraftService = {
      allPreliminaryDrafts: mockAllDraftsSignal,
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Nombres Mockeados'),
    };

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

    it('debería definir la estructura de las columnas de la tabla', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
      expect(service.columns.map(c => c.field)).toEqual([
        'title', 'modality', 'authors', 'description', 'state', 'deadlineStatus', 'acciones'
      ]);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {

    // Helper tipado para construir el contexto
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: { id: userId } as User,
      hasGlobalAccess,
    });

    // --- Datos Simulados Estrictos ---
    const mockActiveDraft = {
      preliminaryDraftId: 'active-1',
      isArchived: false,
    } as PreliminaryDraft;

    const mockArchivedDraftAuthor = {
      preliminaryDraftId: 'arch-1',
      isArchived: true,
      state: stateList.APROBADO,
      proposalData: {
        title: 'Draft Autor',
        modality: Modality.TI,
        description: 'Descripción del anteproyecto',
        authors: [{ id: 'user-123' } as User],
      }
    } as PreliminaryDraft;

    const mockArchivedDraftDirector = {
      preliminaryDraftId: 'arch-2',
      isArchived: true,
      state: stateList.NO_APROBADO,
      proposalData: { director: { id: 'user-123' } as User }
    } as PreliminaryDraft;

    const mockArchivedDraftUnrelated = {
      preliminaryDraftId: 'arch-3',
      isArchived: true,
      state: stateList.EVALUADO,
      proposalData: {
        authors: [{ id: 'user-999' } as User],
        director: { id: 'user-888' } as User
      }
    } as PreliminaryDraft;

    it('debería excluir los anteproyectos que NO están archivados (isArchived = false)', () => {
      mockAllDraftsSignal.set([mockActiveDraft, mockArchivedDraftAuthor]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('arch-1');
    });

    it('debería retornar TODOS los archivados si el contexto tiene acceso global', () => {
      mockAllDraftsSignal.set([
        mockArchivedDraftAuthor,
        mockArchivedDraftDirector,
        mockArchivedDraftUnrelated,
      ]);

      const context = createContext('user-123', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(3);
    });

    it('debería retornar solo archivados propios (Autor, Director) si NO tiene acceso global', () => {
      mockAllDraftsSignal.set([
        mockArchivedDraftAuthor,
        mockArchivedDraftDirector,
        mockArchivedDraftUnrelated,
      ]);

      const context = createContext('user-123', false);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);

      const ids = data.map(d => d['id']);
      expect(ids).toContain('arch-1');
      expect(ids).toContain('arch-2');
      expect(ids).not.toContain('arch-3');
    });

    it('debería otorgar acceso si el usuario es Codirector o Asesor', () => {
      const mockCodirectorDraft = {
        preliminaryDraftId: 'arch-codir',
        isArchived: true,
        proposalData: { codirector: { id: 'user-123' } as User }
      } as PreliminaryDraft;

      const mockAdvisorDraft = {
        preliminaryDraftId: 'arch-adv',
        isArchived: true,
        proposalData: { advisor: { id: 'user-123' } as User }
      } as PreliminaryDraft;

      mockAllDraftsSignal.set([mockCodirectorDraft, mockAdvisorDraft]);

      const context = createContext('user-123', false);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
      expect(data.map(d => d['id'])).toEqual(['arch-codir', 'arch-adv']);
    });

    it('debería mapear las columnas correctamente y aplicar fallbacks por defecto cuando falten datos', () => {
      const draftIncompleto = {
        preliminaryDraftId: 'arch-4',
        isArchived: true,
        state: stateList.EN_REVISION,
        proposalData: { authors: [{ id: 'user-123' } as User] }
      } as PreliminaryDraft;

      mockAllDraftsSignal.set([
        mockArchivedDraftAuthor,
        draftIncompleto
      ]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificación del draft completo ajustada a los valores de las enums y el servicio
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-1',
        title: 'Draft Autor',
        modality: Modality.TI,
        authors: 'Nombres Mockeados',
        description: 'Descripción del anteproyecto',
        state: stateList.APROBADO,
        deadlineStatus: 'Resolución emitida',
        allowedActions: ['ver descripcion', 'ver']
      }));

      // Verificación de los Fallbacks en el borrador incompleto
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-4',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción'
      }));
    });
  });
});
