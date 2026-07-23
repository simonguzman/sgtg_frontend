import { TestBed } from '@angular/core/testing';
import { ProposalMapperService } from './proposal-mapper.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';

// Hacemos un mock parcial de date-utils para controlar el tiempo en las pruebas
jest.mock('../../../../../core/utils/date-utils', () => ({
  getRemainingBusinessDays: jest.fn()
}));
import { getRemainingBusinessDays } from '../../../../../core/utils/date-utils';

describe('ProposalMapperService', () => {
  let service: ProposalMapperService;

  const mockUser: User = { id: 'user-1', firstName: 'Juan', lastName: 'Pérez' } as User;
  const mockProposal = {
    id: 'prop-1',
    title: 'Sistema de Gestión',
    modality: 'Desarrollo',
    description: 'Desc',
    state: stateList.EN_REVISION,
    director: mockUser,
    authors: [{ firstName: 'Ana', lastName: 'Gómez' } as User],
  } as unknown as Proposal;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProposalMapperService]
    });
    service = TestBed.inject(ProposalMapperService);
    jest.clearAllMocks();
  });

  describe('mapProposalToTable - Permisos (allowedActions)', () => {
    it('debe otorgar todos los permisos si el usuario es Administrador', () => {
      const result = service.mapProposalToTable(mockProposal, true, 'other-user');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver', 'editar', 'eliminar']);
    });

    it('debe otorgar todos los permisos si el usuario es el Dueño (Director)', () => {
      const result = service.mapProposalToTable(mockProposal, false, 'user-1');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver', 'editar', 'eliminar']);
    });

    it('debe restringir permisos si no es admin ni dueño', () => {
      const result = service.mapProposalToTable(mockProposal, false, 'other-user');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver']);
    });
  });

  describe('buildHiddenParticipants', () => {
    it('debe concatenar nombres de director, codirector, asesor y autores correctamente', () => {
      const result = service.mapProposalToTable(mockProposal, false, undefined);
      expect(result.hiddenParticipants).toContain('Juan Pérez');
      expect(result.hiddenParticipants).toContain('Ana Gómez');
    });
  });

  describe('getDeadlineBadge', () => {
    it('debe retornar estado de evaluación si la propuesta está Aprobada/No Aprobada', () => {
      const evaluatedProposal = {
        ...mockProposal,
        state: stateList.APROBADO,
        evaluations: [{ deadlineStatus: 'Aprobado a tiempo' }]
      } as unknown as Proposal;

      const result = service.mapProposalToTable(evaluatedProposal, false, undefined);
      expect(result.deadlineStatus).toBe('Aprobado a tiempo');
    });

    it('debe retornar "Sin límite" si no hay fecha de límite (evaluationDeadline)', () => {
      const result = service.mapProposalToTable(mockProposal, false, undefined);
      expect(result.deadlineStatus).toBe('Sin límite');
    });

    it('debe calcular días restantes si está pendiente y tiene fecha', () => {
      (getRemainingBusinessDays as jest.Mock).mockReturnValue(5);
      const pendingWithDate = { ...mockProposal, evaluationDeadline: new Date() };

      const result = service.mapProposalToTable(pendingWithDate, false, undefined);
      expect(result.deadlineStatus).toBe('Quedan 5 días hábiles');
    });

    it('debe alertar vencimiento si los días restantes son negativos', () => {
      (getRemainingBusinessDays as jest.Mock).mockReturnValue(-2);
      const pendingWithDate = { ...mockProposal, evaluationDeadline: new Date() };

      const result = service.mapProposalToTable(pendingWithDate, false, undefined);
      expect(result.deadlineStatus).toBe('Plazo vencido (2 días hábiles de retraso)');
    });
  });
});
