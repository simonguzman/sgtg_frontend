import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedThesisWorksTabService } from '../../history-page/services/archived-thesis-works-tab.service';
import { ThesisWorkService } from '../../../../thesis-work/services/thesis-work.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { ThesisWork } from '../../../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { stateList } from '../../../../../core/enums/state.enum';

describe('ArchivedThesisWorksTabService', () => {
  let service: ArchivedThesisWorksTabService;

  // Mocks
  let mockThesisWorkService: Partial<ThesisWorkService>;
  let mockUserService: Partial<UserService>;

  // Signal reactiva para simular los trabajos de grado
  let mockAllWorksSignal: WritableSignal<ThesisWork[]>;

  beforeEach(() => {
    mockAllWorksSignal = signal([]);

    mockThesisWorkService = {
      allThesisWorks: mockAllWorksSignal,
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Nombres Mockeados'),
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
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('TRABAJOS');
    });

    it('debería definir la estructura de las columnas correctamente', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
      expect(service.columns.map(c => c.field)).toEqual([
        'title', 'modality', 'authors', 'description', 'state', 'maxDeliveryDate', 'acciones'
      ]);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {
    // Helper para generar el contexto de forma tipada
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: { id: userId } as User,
      hasGlobalAccess,
    });

    // --- Mocks simulados ---
    const mockActiveWork = {
      thesisWorkId: 'active-1',
      isArchived: false,
    } as unknown as ThesisWork;

    const mockArchivedWorkAuthor = {
      thesisWorkId: 'arch-1',
      isArchived: true,
      state: stateList.EVALUADO,
      preliminaryDraftData: {
        proposalData: {
          title: 'Trabajo Autor',
          modality: Modality.TI,
          authors: [{ id: 'user-123' } as User],
        }
      }
    } as unknown as ThesisWork;

    const mockArchivedWorkDirector = {
      thesisWorkId: 'arch-2',
      isArchived: true,
      state: stateList.APROBADO,
      preliminaryDraftData: {
        proposalData: {
          director: { id: 'user-123' } as User,
        }
      }
    } as unknown as ThesisWork;

    const mockArchivedWorkUnrelated = {
      thesisWorkId: 'arch-3',
      isArchived: true,
      state: stateList.EN_DESARROLLO,
      preliminaryDraftData: {
        proposalData: {
          authors: [{ id: 'user-999' } as User],
          director: { id: 'user-888' } as User,
        }
      }
    } as unknown as ThesisWork;

    it('debería excluir los trabajos que NO están archivados (isArchived = false)', () => {
      mockAllWorksSignal.set([
        mockActiveWork,
        mockArchivedWorkAuthor
      ]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('arch-1');
    });

    it('debería retornar TODOS los trabajos archivados si el contexto tiene acceso global', () => {
      mockAllWorksSignal.set([
        mockArchivedWorkAuthor,
        mockArchivedWorkDirector,
        mockArchivedWorkUnrelated,
      ]);

      const context = createContext('user-123', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(3);
    });

    it('debería retornar solo trabajos propios (Autor, Director) si NO tiene acceso global', () => {
      mockAllWorksSignal.set([
        mockArchivedWorkAuthor,
        mockArchivedWorkDirector,
        mockArchivedWorkUnrelated,
      ]);

      const context = createContext('user-123', false);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);

      const ids = data.map(d => d['id']);
      expect(ids).toContain('arch-1');
      expect(ids).toContain('arch-2');
      expect(ids).not.toContain('arch-3');
    });

    it('debería mapear las columnas correctamente y aplicar fallbacks por defecto cuando falten datos', () => {
      const workIncompleto = {
        thesisWorkId: 'arch-4',
        isArchived: true,
        state: stateList.EN_REVISION,
        preliminaryDraftData: {
          proposalData: {
            authors: [{ id: 'user-123' } as User]
          }
        }
      } as unknown as ThesisWork;

      mockAllWorksSignal.set([
        mockArchivedWorkAuthor,
        workIncompleto
      ]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificamos el trabajo completo asegurando que el mapeo y los enums coinciden
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-1',
        title: 'Trabajo Autor',
        modality: 'Trabajo de investigación',
        authors: 'Nombres Mockeados',
        description: 'Sin descripción',
        state: stateList.EVALUADO,
        maxDeliveryDate: 'Sin fecha límite', // <- Corregido
        allowedActions: ['ver descripcion', 'ver']
      }));

      // Verificamos los Fallbacks en el trabajo incompleto
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-4',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción'
      }));
    });
  });
});
