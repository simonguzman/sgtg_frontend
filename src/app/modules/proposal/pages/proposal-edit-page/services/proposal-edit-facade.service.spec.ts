import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProposalEditFacadeService } from './proposal-edit-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('ProposalEditFacadeService', () => {
  let service: ProposalEditFacadeService;

  let mockProposalService: { getProposalByIdMock: jest.Mock; validateProposalRules: jest.Mock; updateProposalMock: jest.Mock };
  let mockAuthService: { currentUser: jest.Mock; hasAnyRole: jest.Mock };
  let mockNotificationService: { show: jest.Mock };

  const mockUser = { id: 'user-123' };
  const mockProposal = { id: 'prop-1', director: { id: 'user-123' } } as unknown as Proposal;

  beforeEach(() => {
    mockProposalService = {
      getProposalByIdMock: jest.fn(),
      validateProposalRules: jest.fn(),
      updateProposalMock: jest.fn(),
    };

    mockAuthService = {
      currentUser: jest.fn().mockReturnValue(mockUser),
      hasAnyRole: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalEditFacadeService,
        { provide: ProposalService, useValue: mockProposalService as unknown as ProposalService },
        { provide: AuthService, useValue: mockAuthService as unknown as AuthService },
        { provide: NotificationService, useValue: mockNotificationService as unknown as NotificationService },
      ],
    });

    service = TestBed.inject(ProposalEditFacadeService);
  });

  describe('loadAndAuthorize', () => {
    it('debe emitir onAuthorized si el usuario es el director (Owner)', () => {
      mockProposalService.getProposalByIdMock.mockReturnValue(of(mockProposal));
      mockAuthService.hasAnyRole.mockReturnValue(false); // No es admin
      const onAuthorized = jest.fn();

      service.loadAndAuthorize('prop-1', onAuthorized, jest.fn(), jest.fn());

      expect(onAuthorized).toHaveBeenCalledWith(mockProposal);
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('debe emitir onAuthorized si el usuario es Administrador (aunque no sea dueño)', () => {
      const otherProposal = { id: 'prop-1', director: { id: 'other-user' } } as unknown as Proposal;
      mockProposalService.getProposalByIdMock.mockReturnValue(of(otherProposal));
      mockAuthService.hasAnyRole.mockReturnValue(true); // Sí es admin
      const onAuthorized = jest.fn();

      service.loadAndAuthorize('prop-1', onAuthorized, jest.fn(), jest.fn());

      expect(onAuthorized).toHaveBeenCalledWith(otherProposal);
    });

    it('debe emitir onForbidden y mostrar error si no es ni admin ni dueño', () => {
      const otherProposal = { id: 'prop-1', director: { id: 'other-user' } } as unknown as Proposal;
      mockProposalService.getProposalByIdMock.mockReturnValue(of(otherProposal));
      mockAuthService.hasAnyRole.mockReturnValue(false); // No es admin

      const onForbidden = jest.fn();

      service.loadAndAuthorize('prop-1', jest.fn(), onForbidden, jest.fn());

      expect(onForbidden).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Acceso restringido' })
      );
    });

    it('debe emitir onNotFound si la propuesta no existe', () => {
      mockProposalService.getProposalByIdMock.mockReturnValue(of(null));
      const onNotFound = jest.fn();

      service.loadAndAuthorize('prop-1', jest.fn(), jest.fn(), onNotFound);

      expect(onNotFound).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Atención' })
      );
    });
  });

  describe('saveUpdate', () => {
    it('debe ejecutar onSuccess en actualización exitosa', () => {
      mockProposalService.updateProposalMock.mockReturnValue(of({}));
      const onSuccess = jest.fn();

      service.saveUpdate('1', mockProposal, onSuccess, jest.fn());

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.INFO })); // Procesando
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.CONFIRMATION })); // Exito
      expect(onSuccess).toHaveBeenCalled();
    });

    it('debe ejecutar onError si la actualización falla', () => {
      mockProposalService.updateProposalMock.mockReturnValue(throwError(() => new Error()));
      const onError = jest.fn();

      service.saveUpdate('1', mockProposal, jest.fn(), onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(onError).toHaveBeenCalled();
    });
  });
});
