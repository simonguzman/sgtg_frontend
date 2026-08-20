import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedProposalsTabService } from '../../history-page/services/archived-proposals-tab.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

describe('ArchivedProposalsTabService', () => {
  let service: ArchivedProposalsTabService;

  // Mocks estrictos utilizando Partial
  let mockProposalService: Partial<ProposalService>;
  let mockUserService: Partial<UserService>;

  // Signal para controlar los datos falsos de las propuestas
  let mockAllProposalsSignal: WritableSignal<Proposal[]>;

  beforeEach(() => {
    mockAllProposalsSignal = signal([]);

    mockProposalService = {
      allProposals: mockAllProposalsSignal,
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Estudiantes Mockeados'),
    };

    TestBed.configureTestingModule({
      providers: [
        ArchivedProposalsTabService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: UserService, useValue: mockUserService },
      ],
    });

    service = TestBed.inject(ArchivedProposalsTabService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('PROPUESTAS');
    });

    it('debería definir la estructura de las columnas correctamente', () => {
      expect(service.columns).toBeDefined();
      expect(service.columns.length).toBeGreaterThan(0);
      expect(service.columns.map(c => c.field)).toEqual([
        'title', 'modality', 'authors', 'description', 'state', 'deadlineStatus', 'acciones'
      ]);
    });
  });

  describe('getTableData() - Lógica de Filtrado y Mapeo', () => {

    // Helper tipado para generar el contexto sin usar 'any'
    const createContext = (userId: string, hasGlobalAccess = false): HistoryEvaluationContext => ({
      currentUser: { id: userId } as User,
      hasGlobalAccess,
    });

    // --- Datos Simulados de Propuestas (Zero-Any, Zero-Unknown) ---
    const mockActiveProposal = {
      id: 'active-1',
      isArchived: false,
    } as Proposal;

    const mockArchivedProposalAuthor = {
      id: 'arch-1',
      isArchived: true,
      state: stateList.APROBADO,
      title: 'Propuesta Autor',
      modality: Modality.TI,
      authors: [{ id: 'user-123' } as User],
    } as Proposal;

    const mockArchivedProposalDirector = {
      id: 'arch-2',
      isArchived: true,
      state: stateList.NO_APROBADO,
      director: { id: 'user-123' } as User,
    } as Proposal;

    const mockArchivedProposalUnrelated = {
      id: 'arch-3',
      isArchived: true,
      state: stateList.EVALUADO,
      authors: [{ id: 'user-999' } as User],
      director: { id: 'user-888' } as User,
    } as Proposal;

    it('debería excluir las propuestas que NO están archivadas (isArchived = false)', () => {
      mockAllProposalsSignal.set([
        mockActiveProposal,
        mockArchivedProposalAuthor
      ]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('arch-1');
    });

    it('debería retornar TODAS las propuestas archivadas si el contexto tiene acceso global', () => {
      mockAllProposalsSignal.set([
        mockArchivedProposalAuthor,
        mockArchivedProposalDirector,
        mockArchivedProposalUnrelated,
      ]);

      const context = createContext('user-123', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(3);
    });

    it('debería retornar solo propuestas propias (Autor, Director) si NO tiene acceso global', () => {
      mockAllProposalsSignal.set([
        mockArchivedProposalAuthor,
        mockArchivedProposalDirector,
        mockArchivedProposalUnrelated,
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
      const mockCodirectorProposal = {
        id: 'arch-codir',
        isArchived: true,
        codirector: { id: 'user-123' } as User
      } as Proposal;

      const mockAdvisorProposal = {
        id: 'arch-adv',
        isArchived: true,
        advisor: { id: 'user-123' } as User
      } as Proposal;

      mockAllProposalsSignal.set([mockCodirectorProposal, mockAdvisorProposal]);

      const context = createContext('user-123', false);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
      expect(data.map(d => d['id'])).toEqual(['arch-codir', 'arch-adv']);
    });

    it('debería mapear las columnas correctamente y aplicar fallbacks por defecto cuando falten datos', () => {
      const proposalIncompleta = {
        id: 'arch-4',
        isArchived: true,
        state: stateList.EVALUADO,
        authors: [{ id: 'user-123' } as User]
      } as Proposal;

      mockAllProposalsSignal.set([
        mockArchivedProposalAuthor,
        proposalIncompleta
      ]);

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificamos la propuesta completa haciendo match con los valores reales del servicio
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-1',
        title: 'Propuesta Autor',
        modality: 'Trabajo de investigación', // <- Corregido (viene de Modality.TI)
        authors: 'Estudiantes Mockeados',
        description: 'Sin descripción', // <- Añadido (se aplica el fallback)
        state: 'Aprobado', // <- Corregido (viene de stateList.APROBADO)
        deadlineStatus: 'Evaluación completada', // <- Corregido (el nuevo valor de tu servicio)
        allowedActions: ['ver descripcion', 'ver']
      }));

      // Verificamos los Fallbacks en la incompleta
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-4',
        title: 'Sin título',
        modality: 'No definida',
        description: 'Sin descripción'
      }));
    });
  });
});
