import { TestBed } from '@angular/core/testing';

import { ProposalRulesService } from './proposal-rules.service';
import { ProposalStorageService } from './proposal-storage.service';
import { UserService } from '../../users/services/user.service';

import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

describe('ProposalRulesService', () => {
  let service: ProposalRulesService;

  let mockStorageService: Partial<ProposalStorageService>;
  let mockUserService: Partial<UserService>;

  beforeEach(() => {
    mockStorageService = {
      getProposalsListSnapshot: jest.fn().mockReturnValue([])
    };

    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Juan Perez'),
      addRoleToUser: jest.fn(),
      removeRoleFromUser: jest.fn()
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
    jest.clearAllMocks();
  });

  describe('validateProposalRules', () => {
    it('debería fallar si el director y codirector son la misma persona', () => {
      const invalidProposal: Partial<Proposal> = {
        director: { id: 'doc-1' } as any,
        codirector: { id: 'doc-1' } as any,
      };

      const result = service.validateProposalRules(invalidProposal);

      expect(result).toBe('Un docente no puede ser Director y Codirector simultáneamente.');
    });

    it('debería fallar si un estudiante ya tiene 2 o más propuestas registradas', () => {
      const newProposal: Partial<Proposal> = {
        id: 'prop-3',
        authors: [{ id: 'stu-1' } as any]
      };

      // Simulamos que el Storage devuelve 2 propuestas donde 'stu-1' ya es autor
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

      // El estudiante solo tiene 1 propuesta previa
      (mockStorageService.getProposalsListSnapshot as jest.Mock).mockReturnValue([
        { id: 'prop-1', authors: [{ id: 'stu-1' }] }
      ] as Proposal[]);

      const result = service.validateProposalRules(validProposal);

      expect(result).toBeNull(); // Cumple las reglas
    });
  });

  describe('handleRoleExchange', () => {
    it('no debería hacer nada si el ID antiguo y nuevo son iguales', () => {
      service.handleRoleExchange('doc-1', 'doc-1', UserRoleType.CODIRECTOR, 'prop-1');

      expect(mockUserService.addRoleToUser).not.toHaveBeenCalled();
      expect(mockUserService.removeRoleFromUser).not.toHaveBeenCalled();
    });

    it('debería agregar el rol al nuevo docente', () => {
      service.handleRoleExchange(undefined, 'doc-2', UserRoleType.CODIRECTOR, 'prop-1');

      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('doc-2', UserRoleType.CODIRECTOR);
      expect(mockUserService.removeRoleFromUser).not.toHaveBeenCalled();
    });

    it('debería remover el rol del docente antiguo si ya no tiene otras propuestas asociadas', () => {
      // El storage devuelve vacío, significando que 'doc-1' no está en otras propuestas
      (mockStorageService.getProposalsListSnapshot as jest.Mock).mockReturnValue([]);

      service.handleRoleExchange('doc-1', 'doc-2', UserRoleType.CODIRECTOR, 'prop-1');

      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('doc-2', UserRoleType.CODIRECTOR);
      expect(mockUserService.removeRoleFromUser).toHaveBeenCalledWith('doc-1', UserRoleType.CODIRECTOR);
    });

    it('no debería remover el rol del docente antiguo si aún pertenece a otra propuesta', () => {
      // El storage devuelve otra propuesta donde 'doc-1' sigue siendo codirector
      (mockStorageService.getProposalsListSnapshot as jest.Mock).mockReturnValue([
        { id: 'prop-2', codirector: { id: 'doc-1' } }
      ] as Proposal[]);

      service.handleRoleExchange('doc-1', 'doc-2', UserRoleType.CODIRECTOR, 'prop-1');

      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('doc-2', UserRoleType.CODIRECTOR);
      // No debe llamar a remove porque sigue activo en prop-2
      expect(mockUserService.removeRoleFromUser).not.toHaveBeenCalled();
    });
  });
});
