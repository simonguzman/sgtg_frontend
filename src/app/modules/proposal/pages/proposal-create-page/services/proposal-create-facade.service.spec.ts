import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProposalCreateFacadeService } from './proposal-create-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';

interface MockProposalService {
  validateProposalRules: jest.Mock;
  createProposalMock: jest.Mock;
}

interface MockNotificationService {
  show: jest.Mock;
}

interface MockRouter {
  navigate: jest.Mock;
}

describe('ProposalCreateFacadeService', () => {
  let service: ProposalCreateFacadeService;
  let mockProposalService: MockProposalService;
  let mockNotificationService: MockNotificationService;
  let mockRouter: MockRouter;
  const mockProposal = { id: '1', title: 'Test Proposal' } as Proposal;

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProposalService = {
      validateProposalRules: jest.fn(),
      createProposalMock: jest.fn(),
    };
    mockNotificationService = {
      show: jest.fn(),
    };
    mockRouter = {
      navigate: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ProposalCreateFacadeService,
        { provide: ProposalService, useValue: mockProposalService as Partial<ProposalService> },
        { provide: NotificationService, useValue: mockNotificationService as Partial<NotificationService> },
        { provide: Router, useValue: mockRouter as Partial<Router> },
      ],
    });
    service = TestBed.inject(ProposalCreateFacadeService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('validate()', () => {
    it('debe retornar true si no hay errores de validación', () => {
      mockProposalService.validateProposalRules.mockReturnValue(null);
      const result = service.validate(mockProposal);
      expect(result).toBeTruthy();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('debe retornar false y mostrar notificación de error si la validación falla', () => {
      const errorMessage = 'Falta el título';
      mockProposalService.validateProposalRules.mockReturnValue(errorMessage);
      const result = service.validate(mockProposal);
      expect(result).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Atención',
          message: errorMessage,
          type: NotificationType.ERROR
        })
      );
    });
  });

  describe('save()', () => {
    it('debe completar el flujo de éxito: notificar, guardar, redireccionar y ejecutar onSuccess', () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();
      mockProposalService.createProposalMock.mockReturnValue(of({}));
      service.save(mockProposal, onSuccessMock, onErrorMock);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Procesando registro',
          type: NotificationType.INFO
        })
      );
      expect(mockProposalService.createProposalMock).toHaveBeenCalledWith(mockProposal);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¡Propuesta registrada!',
          type: NotificationType.CONFIRMATION
        })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('debe manejar el flujo de error: notificar error y ejecutar onError', () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();
      mockProposalService.createProposalMock.mockReturnValue(throwError(() => new Error('Error de servidor')));
      service.save(mockProposal, onSuccessMock, onErrorMock);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de servidor',
          type: NotificationType.ERROR
        })
      );
      expect(onErrorMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });
});
