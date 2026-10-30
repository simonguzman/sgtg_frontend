import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ProposalRulesService, propuestaEditable } from './proposal-rules.service';
import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { Proposal } from '../interfaces/proposal.interface';
import { stateList } from '../../../core/enums/state.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';

describe('ProposalRulesService', () => {
  let service: ProposalRulesService;
  let mockStorageService: Partial<ProposalStorageService>;
  let mockUserService: Partial<UserService>;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockStorageService = {
      getProposalsListSnapshot: jest.fn().mockReturnValue([])
    };
    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Juan Perez')
    };
    TestBed.configureTestingModule({
      providers: [
        ProposalRulesService,
        { provide: ProposalStorageService, useValue: mockStorageService as ProposalStorageService },
        { provide: UserService, useValue: mockUserService as UserService }
      ]
    });
    service = TestBed.inject(ProposalRulesService);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('validateProposalRules', () => {
    it('debería fallar si el director y codirector son la misma persona', () => {
      const invalidProposal: Partial<Proposal> = {
        director: { id: 'doc-1' } as any,
        codirector: { id: 'doc-1' } as any
      };
      const result = service.validateProposalRules(invalidProposal);
      expect(result).toBe('Un docente no puede ser Director y Codirector simultáneamente.');
    });
    it('debería fallar si un estudiante ya tiene 2 o más propuestas registradas', () => {
      const newProposal: Partial<Proposal> = {
        id: 'prop-3',
        authors: [{ id: 'stu-1' } as any]
      };
      (mockStorageService.getProposalsListSnapshot as jest.Mock).mockReturnValue([
        { id: 'prop-1', authors: [{ id: 'stu-1' }] },
        { id: 'prop-2', authors: [{ id: 'stu-1' }] }
      ] as Proposal[]);
      const result = service.validateProposalRules(newProposal);
      expect(result).toBe('El estudiante Juan Perez ya tiene 2 propuestas registradas (límite máximo institucional).');
      expect(mockUserService.getUserFullName).toHaveBeenCalledWith('stu-1');
    });
    it('debería retornar null si la propuesta cumple todas las reglas', () => {
      const validProposal: Partial<Proposal> = {
        id: 'prop-nuevo',
        director: { id: 'doc-1' } as any,
        codirector: { id: 'doc-2' } as any,
        authors: [{ id: 'stu-1' } as any]
      };
      (mockStorageService.getProposalsListSnapshot as jest.Mock).mockReturnValue([
        { id: 'prop-1', authors: [{ id: 'stu-1' }] }
      ] as Proposal[]);
      const result = service.validateProposalRules(validProposal);
      expect(result).toBeNull();
    });
  });
});

describe('propuestaEditable', () => {
  const documento = { id: 'd1' } as FileDocument;

  it('permite corregir antes de radicar el formato A', () => {
    expect(propuestaEditable({ state: stateList.EN_REVISION, documents: [] })).toBe(true);
  });
  it('permite corregir después de un concepto no pertinente del Comité', () => {
    expect(propuestaEditable({ state: stateList.NO_PERTINENTE, documents: [documento] })).toBe(true);
  });
  it.each([stateList.EN_REVISION, stateList.PERTINENTE])('no permite corregir una propuesta radicada en estado %s', estado => {
    expect(propuestaEditable({ state: estado, documents: [documento] })).toBe(false);
  });
});
