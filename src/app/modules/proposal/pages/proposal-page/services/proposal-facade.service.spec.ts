import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProposalFacadeService } from './proposal-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ProposalMapperService } from './proposal-mapper.service';
import { signal } from '@angular/core';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { ProposalTableRow } from '../models/proposal-page.model';

describe('ProposalFacadeService', () => {
  let service: ProposalFacadeService;

  let mockProposalService: { proposals: any; deleteProposalMock: jest.Mock };
  let mockAuthService: { currentUser: any; hasAnyRole: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockMapperService: { mapProposalToTable: jest.Mock };

  beforeEach(() => {
    mockProposalService = {
      proposals: signal([{ id: 'prop-1' } as Proposal]),
      deleteProposalMock: jest.fn()
    };

    mockAuthService = {
      currentUser: signal({ id: 'user-1' }),
      hasAnyRole: jest.fn()
    };

    mockNotificationService = { show: jest.fn() };

    mockMapperService = {
      mapProposalToTable: jest.fn().mockReturnValue({ id: 'prop-1', title: 'Mapped' } as ProposalTableRow)
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalFacadeService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ProposalMapperService, useValue: mockMapperService }
      ]
    });

    service = TestBed.inject(ProposalFacadeService);
  });

  describe('Propiedades Computed', () => {
    it('proposalsTableData debe retornar datos mapeados reactivamente', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true); // isAdmin

      const tableData = service.proposalsTableData();

      expect(tableData.length).toBe(1);
      expect(tableData[0].title).toBe('Mapped');
      expect(mockMapperService.mapProposalToTable).toHaveBeenCalled();
    });

    it('headerButtons debe incluir "Registrar propuesta" si tiene rol', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      const buttons = service.headerButtons();
      expect(buttons.some(b => b.label === 'Registrar propuesta')).toBeTruthy();
    });

    it('headerButtons NO debe incluir "Registrar propuesta" si no tiene permisos', () => {
      mockAuthService.hasAnyRole.mockReturnValue(false);

      const buttons = service.headerButtons();
      expect(buttons.some(b => b.label === 'Registrar propuesta')).toBeFalsy();
    });
  });

  describe('deleteProposal', () => {
    it('debe manejar el flujo de éxito y mostrar notificaciones', () => {
      mockProposalService.deleteProposalMock.mockReturnValue(of({}));
      const onSuccess = jest.fn();

      service.deleteProposal('1', onSuccess, jest.fn());

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.INFO }));
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.CONFIRMATION }));
      expect(onSuccess).toHaveBeenCalled();
    });

    it('debe manejar el flujo de error y notificar', () => {
      mockProposalService.deleteProposalMock.mockReturnValue(throwError(() => new Error()));
      const onError = jest.fn();

      service.deleteProposal('1', jest.fn(), onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
      expect(onError).toHaveBeenCalled();
    });
  });

  describe('showRestrictedAccessNotification', () => {
    it('debe mostrar notificación de error por acceso restringido', () => {
      service.showRestrictedAccessNotification();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR, title: 'Acceso restringido' })
      );
    });
  });
});
