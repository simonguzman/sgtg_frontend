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
import { TrabajoGradoStoreService } from '../../../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { crearTrabajoDePrueba, crearTrabajoEnCurso } from '../../../../../testing/trabajo-grado-de-prueba';

describe('ProposalFacadeService', () => {
  let service: ProposalFacadeService;
  const trabajosDelStore = signal([crearTrabajoDePrueba({ id: 1 }), crearTrabajoEnCurso({ id: 2 })]);

  let mockProposalService: { proposals: any; annulProposal: jest.Mock };
  let mockAuthService: { currentUser: any; hasAnyRole: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockMapperService: { mapProposalToTable: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockProposalService = {
      proposals: signal([{ id: 'prop-1' } as Proposal]),
      annulProposal: jest.fn()
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
        { provide: ProposalMapperService, useValue: mockMapperService },
        { provide: TrabajoGradoStoreService, useValue: { trabajos: trabajosDelStore } }
      ]
    });

    service = TestBed.inject(ProposalFacadeService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Propiedades Computed', () => {
    it('proposalsTableData debe retornar datos mapeados reactivamente', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true); // isAdmin

      const tableData = service.proposalsTableData();

      expect(tableData).toHaveLength(1);
      expect(tableData[0].title).toBe('Mapped');
      expect(mockMapperService.mapProposalToTable).toHaveBeenCalled();
    });

    it('la anulación depende de la etapa del trabajo en el backend', () => {
      mockProposalService.proposals.set([{ id: '1' } as Proposal, { id: '2' } as Proposal]);
      service.proposalsTableData();
      expect(mockMapperService.mapProposalToTable.mock.calls.map(llamada => llamada[2])).toEqual([true, false]);
    });

    it('headerButtons debe incluir "Registrar propuesta" si tiene rol', () => {
      mockAuthService.hasAnyRole.mockReturnValue(true);

      const buttons = service.headerButtons();
      expect(buttons.some(button => button.label === 'Registrar propuesta')).toBeTruthy();
    });

    it('headerButtons NO debe incluir "Registrar propuesta" si no tiene permisos', () => {
      mockAuthService.hasAnyRole.mockReturnValue(false);

      const buttons = service.headerButtons();
      expect(buttons.some(button => button.label === 'Registrar propuesta')).toBeFalsy();
    });
  });

  describe('annulProposal', () => {
    it('anula con la justificación y avisa que quedó en el historial', () => {
      mockProposalService.annulProposal.mockReturnValue(of({}));
      const onSuccess = jest.fn();

      service.annulProposal('1', 'Motivo', onSuccess, jest.fn());

      expect(mockProposalService.annulProposal).toHaveBeenCalledWith('1', 'Motivo');
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.CONFIRMATION, title: 'Propuesta anulada' }));
      expect(onSuccess).toHaveBeenCalled();
    });

    it('debe manejar el flujo de error y notificar', () => {
      mockProposalService.annulProposal.mockReturnValue(throwError(() => new Error('Simulated Error')));
      const onError = jest.fn();

      service.annulProposal('1', 'Motivo', jest.fn(), onError);

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
