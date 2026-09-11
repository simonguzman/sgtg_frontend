import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { ArchivedProposalsTabService } from './archived-proposals-tab.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { HistoryEvaluationContext } from '../../../interfaces/history-evaluation-context.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { ARCHIVED_ALLOWED_ACTIONS } from '../models/archived-tab-columns.model';
import { stateList } from '../../../../../core/enums/state.enum';
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
  title: 'Propuesta de Prueba',
  modality: Modality.TI, // Usamos directamente el enum
  description: 'Descripción de prueba',
  state: stateList.EN_REVISION,
  isArchived: true,
  director: createMockUser(),
  authors: [createMockUser()],
  evaluations: [],
  createdAt: new Date(),
  documents: [],
  ...overrides
} as Proposal);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ArchivedProposalsTabService', () => {
  let service: ArchivedProposalsTabService;

  // 🔹 REFACTOR: Tipado estricto de las dependencias
  let mockProposalService: { allProposals: WritableSignal<Proposal[]> };
  let mockUserService: { getAuthorsNames: jest.Mock<string, [User[] | undefined]> };

  beforeEach(() => {
    // 🔕 Silenciar los console.error y console.warn para mantener limpia la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockProposalService = {
      allProposals: signal<Proposal[]>([])
    };

    mockUserService = {
      getAuthorsNames: jest.fn().mockReturnValue('Autores Mockeados')
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
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
  });

  describe('Configuración Básica', () => {
    it('debería instanciarse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener el tabValue correcto', () => {
      expect(service.tabValue).toBe('PROPUESTAS');
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

    it('debería excluir las propuestas que NO están archivadas (isArchived = false)', () => {
      const activeProposal = createMockProposal({ id: 'act-1', isArchived: false });
      const archivedProposal = createMockProposal({ id: 'arch-1', isArchived: true });

      mockProposalService.allProposals.set([activeProposal, archivedProposal]);

      const context = createContext('user-default');
      const data = service.getTableData(context);

      expect(data).toHaveLength(1);
      expect(data[0]['id']).toBe('arch-1');
    });

    it('debería retornar TODAS las propuestas archivadas si el contexto tiene acceso global', () => {
      const proposalPropia = createMockProposal({
        id: 'arch-1',
        authors: [createMockUser({ id: 'user-admin' })]
      });
      const proposalAjena = createMockProposal({
        id: 'arch-2',
        authors: [createMockUser({ id: 'user-other' })]
      });

      mockProposalService.allProposals.set([proposalPropia, proposalAjena]);

      const context = createContext('user-admin', true);
      const data = service.getTableData(context);

      expect(data).toHaveLength(2);
    });

    it('debería mapear las columnas correctamente y aplicar fallbacks si faltan datos opcionales', () => {
      const fullProposal = createMockProposal({
        id: 'arch-1',
        title: 'Propuesta Completa',
        modality: Modality.TI,
        description: 'Descripción completa',
        state: stateList.EN_REVISION,
        authors: [createMockUser({ id: 'user-123' })]
      });

      const emptyProposal = createMockProposal({
        id: 'arch-empty',
        title: undefined,
        modality: undefined,
        description: undefined,
        authors: [], // Arreglo vacío para simular falta de autores
        director: createMockUser({ id: 'user-123' }) // <-- FIX: Le damos acceso siendo el director para que no sea filtrada
      });

      mockProposalService.allProposals.set([fullProposal, emptyProposal]);

      // Simulamos que para la propuesta vacía, getAuthorsNames retorne falso/vacío
      mockUserService.getAuthorsNames.mockImplementation((authors) => {
        return authors && authors.length > 0 ? 'Autores Mockeados' : '';
      });

      const context = createContext('user-123');
      const data = service.getTableData(context);

      // Verificación de propuesta completa
      expect(data[0]).toEqual(expect.objectContaining({
        id: 'arch-1',
        title: 'Propuesta Completa',
        modality: Modality.TI,
        authors: 'Autores Mockeados',
        description: 'Descripción completa',
        state: stateList.EN_REVISION,
        allowedActions: ARCHIVED_ALLOWED_ACTIONS
      }));
      expect(data[0]).toHaveProperty('deadlineStatus');

      // Verificación de Fallbacks por defecto
      expect(data[1]).toEqual(expect.objectContaining({
        id: 'arch-empty',
        title: 'Sin título',
        modality: 'No definida',
        authors: 'Sin asignar', // Retornado exitosamente gracias a la función espía
        description: 'Sin descripción'
      }));
    });

    it('debería aplicar el fallback "Sin asignar" cuando getAuthorsNames retorna un valor vacío directamente', () => {
      const proposalSinAutores = createMockProposal({
        id: 'arch-no-authors',
        authors: [createMockUser({ id: 'user-123' })]
      });

      mockProposalService.allProposals.set([proposalSinAutores]);
      mockUserService.getAuthorsNames.mockReturnValue('');

      const context = createContext('user-123');
      const data = service.getTableData(context);

      expect(data[0]['authors']).toBe('Sin asignar');
    });
  });
});
