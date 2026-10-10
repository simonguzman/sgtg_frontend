import { TestBed } from '@angular/core/testing';
import { ProposalMapperService } from './proposal-mapper.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';

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
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [ProposalMapperService]
    });
    service = TestBed.inject(ProposalMapperService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('mapProposalToTable - Permisos (allowedActions)', () => {
    const radicada = { ...mockProposal, documents: [{ id: 'doc-1' }] } as unknown as Proposal;

    it('el director puede corregir su propuesta antes de radicarla', () => {
      const result = service.mapProposalToTable(mockProposal, 'user-1');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver', 'editar']);
    });

    it('el director puede corregir su propuesta tras un NO APROBADO', () => {
      const noAprobada = { ...radicada, state: stateList.NO_APROBADO } as Proposal;
      const result = service.mapProposalToTable(noAprobada, 'user-1');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver', 'editar']);
    });

    it('el director no puede corregir una propuesta radicada en revisión', () => {
      const result = service.mapProposalToTable(radicada, 'user-1');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver']);
    });

    it('otros usuarios solo consultan', () => {
      const result = service.mapProposalToTable(mockProposal, 'other-user');
      expect(result.allowedActions).toEqual(['ver descripcion', 'ver']);
    });
  });

  describe('buildHiddenParticipants', () => {
    it('debe concatenar nombres de director, codirector, asesor y autores correctamente', () => {
      const result = service.mapProposalToTable(mockProposal, undefined);
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

      const result = service.mapProposalToTable(evaluatedProposal, undefined);
      expect(result.deadlineStatus).toBe('Aprobado a tiempo');
    });

    it('debe retornar "Sin límite" si no hay fecha de límite (evaluationDeadline)', () => {
      const result = service.mapProposalToTable(mockProposal, undefined);
      expect(result.deadlineStatus).toBe('Sin límite');
    });

    it('debe calcular días restantes si está pendiente y tiene fecha', () => {
      (getRemainingBusinessDays as jest.Mock).mockReturnValue(5);
      const pendingWithDate = { ...mockProposal, evaluationDeadline: new Date() };

      const result = service.mapProposalToTable(pendingWithDate, undefined);
      expect(result.deadlineStatus).toBe('Quedan 5 días hábiles');
    });

    it('debe alertar vencimiento si los días restantes son negativos', () => {
      (getRemainingBusinessDays as jest.Mock).mockReturnValue(-2);
      const pendingWithDate = { ...mockProposal, evaluationDeadline: new Date() };

      const result = service.mapProposalToTable(pendingWithDate, undefined);
      expect(result.deadlineStatus).toBe('Plazo vencido (2 días hábiles de retraso)');
    });
  });
});
