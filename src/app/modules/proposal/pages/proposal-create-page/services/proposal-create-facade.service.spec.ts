import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { ProposalCreateFacadeService } from './proposal-create-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';

// 1. Interfaces estrictas para los mocks, evitando el uso de 'any'
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

  // 2. Declaración fuertemente tipada de los mocks
  let mockProposalService: MockProposalService;
  let mockNotificationService: MockNotificationService;
  let mockRouter: MockRouter;

  // 3. Uso de type assertion directo (sin unknown)
  // o Partial para construir datos de prueba seguros.
  const mockProposal = { id: '1', title: 'Test Proposal' } as Proposal;

  beforeEach(() => {
    // 1. Espías para silenciar la consola globalmente en todas las pruebas
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // Inicialización limpia de las funciones mockeadas
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
        // 4. Se utiliza Partial<T> para inyectar los mocks sin romper el tipado estricto
        { provide: ProposalService, useValue: mockProposalService as Partial<ProposalService> },
        { provide: NotificationService, useValue: mockNotificationService as Partial<NotificationService> },
        { provide: Router, useValue: mockRouter as Partial<Router> },
      ],
    });

    service = TestBed.inject(ProposalCreateFacadeService);
  });

  afterEach(() => {
    // 2. Restauramos todos los espías y mocks originales al terminar cada prueba
    // Cambiamos clearAllMocks por restoreAllMocks para que se limpien los espías del console
    jest.restoreAllMocks();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('validate()', () => {
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

      // Simulamos respuesta exitosa del observable
      mockProposalService.createProposalMock.mockReturnValue(of({}));

      service.save(mockProposal, onSuccessMock, onErrorMock);

      // Verificamos notificación de inicio
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Procesando registro',
          type: NotificationType.INFO
        })
      );

      // Verificamos llamada al servicio
      expect(mockProposalService.createProposalMock).toHaveBeenCalledWith(mockProposal);

      // Verificamos notificación de éxito (fue llamado por segunda vez)
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '¡Propuesta registrada!',
          type: NotificationType.CONFIRMATION
        })
      );

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

      service.save(mockProposal, onSuccessMock, onErrorMock);

      // Verificamos notificación de error
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de servidor',
          type: NotificationType.ERROR
        })
      );

      // Verificamos que se ejecutó onError y NO onSuccess ni la navegación
      expect(onErrorMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();

      // Verificamos que el error se imprimió (atrapado por nuestro espía global del beforeEach)
      expect(console.error).toHaveBeenCalled();
    });
  });
});
