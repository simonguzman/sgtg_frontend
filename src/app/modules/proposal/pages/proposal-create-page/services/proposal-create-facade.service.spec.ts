import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProposalCreateFacadeService } from './proposal-create-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';

describe('ProposalCreateFacadeService', () => {
  let service: ProposalCreateFacadeService;

  // 1. Tipado estricto de los mocks
  let mockProposalService: { validateProposalRules: jest.Mock; createProposalMock: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  const mockProposal = { id: '1', title: 'Test Proposal' } as unknown as Proposal;

  beforeEach(() => {
    // 2. Inicialización de mocks
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
        { provide: ProposalService, useValue: mockProposalService as unknown as ProposalService },
        { provide: NotificationService, useValue: mockNotificationService as unknown as NotificationService },
        { provide: Router, useValue: mockRouter as unknown as Router },
      ],
    });

    service = TestBed.inject(ProposalCreateFacadeService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('validate', () => {
    it('debe retornar true si no hay errores de validación', () => {
      mockProposalService.validateProposalRules.mockReturnValue(null); // Sin error

      const result = service.validate(mockProposal);

      expect(result).toBeTruthy();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('debe retornar false y mostrar notificación de error si la validación falla', () => {
      const errorMessage = 'Falta el título';
      mockProposalService.validateProposalRules.mockReturnValue(errorMessage);

      const result = service.validate(mockProposal);

      expect(result).toBeFalsy();
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Atención',
        message: errorMessage,
        type: NotificationType.ERROR
      });
    });
  });

  describe('save', () => {
    it('debe completar el flujo de éxito: notificar, guardar, redireccionar y ejecutar onSuccess', () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      // Simulamos respuesta exitosa del observable
      mockProposalService.createProposalMock.mockReturnValue(of({}));

      service.save(mockProposal, onSuccessMock, onErrorMock);

      // Verificamos notificación de inicio
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Procesando registro',
        message: 'Estamos guardando la información de la propuesta en el sistema...',
        type: NotificationType.INFO
      });

      // Verificamos llamada al servicio
      expect(mockProposalService.createProposalMock).toHaveBeenCalledWith(mockProposal);

      // Verificamos notificación de éxito (fue llamado por segunda vez)
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: '¡Propuesta registrada!',
        message: 'La propuesta ha sido creada exitosamente y ya puede ser gestionada.',
        type: NotificationType.CONFIRMATION
      });

      // Verificamos redirección y callback de éxito
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
      expect(onSuccessMock).toHaveBeenCalled();
      expect(onErrorMock).not.toHaveBeenCalled();
    });

    it('debe manejar el flujo de error: notificar error y ejecutar onError', () => {
      const onSuccessMock = jest.fn();
      const onErrorMock = jest.fn();

      // Simulamos error en el observable
      mockProposalService.createProposalMock.mockReturnValue(throwError(() => new Error('Error de servidor')));

      // Espiamos console.error para no ensuciar la terminal durante los tests
      jest.spyOn(console, 'error').mockImplementation(() => {});

      service.save(mockProposal, onSuccessMock, onErrorMock);

      // Verificamos notificación de error (segunda llamada)
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de servidor',
        message: 'No se pudo completar el registro. Por favor, intente nuevamente más tarde.',
        type: NotificationType.ERROR
      });

      // Verificamos que se ejecutó onError y NO onSuccess
      expect(onErrorMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
