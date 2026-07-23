import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProposalDetailsFacadeService } from './proposal-details-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { UserService } from '../../../../users/services/user.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { Proposal } from '../../../interfaces/proposal.interface';
import { User } from '../../../../users/interfaces/user.interface';

describe('ProposalDetailsFacadeService', () => {
  let service: ProposalDetailsFacadeService;

  // 1. Tipado estricto de los mocks
  let mockProposalService: { getProposalByIdMock: jest.Mock };
  let mockUserService: { getAuthorsNames: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockRouter: { url: string; navigate: jest.Mock };

  const mockProposal = { id: '1', title: 'Test Proposal' } as unknown as Proposal;
  const mockUser = { firstName: 'Juan', lastName: 'Perez' } as unknown as User;

  beforeEach(() => {
    // 2. Inicialización de mocks
    mockProposalService = {
      getProposalByIdMock: jest.fn(),
    };

    mockUserService = {
      getAuthorsNames: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn(),
    };

    mockRouter = {
      url: '/proposal', // URL por defecto
      navigate: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        ProposalDetailsFacadeService,
        { provide: ProposalService, useValue: mockProposalService as unknown as ProposalService },
        { provide: UserService, useValue: mockUserService as unknown as UserService },
        { provide: NotificationService, useValue: mockNotificationService as unknown as NotificationService },
        { provide: Router, useValue: mockRouter as unknown as Router },
      ],
    });

    service = TestBed.inject(ProposalDetailsFacadeService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('load', () => {
    it('debe ejecutar onSuccess si se encuentra la propuesta', () => {
      mockProposalService.getProposalByIdMock.mockReturnValue(of(mockProposal));
      const onSuccessMock = jest.fn();
      const onNotFoundMock = jest.fn();
      const onErrorMock = jest.fn();

      service.load('1', onSuccessMock, onNotFoundMock, onErrorMock);

      expect(mockProposalService.getProposalByIdMock).toHaveBeenCalledWith('1');
      expect(onSuccessMock).toHaveBeenCalledWith(mockProposal);
      expect(onNotFoundMock).not.toHaveBeenCalled();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });

    it('debe notificar y ejecutar onNotFound si la respuesta es null', () => {
      mockProposalService.getProposalByIdMock.mockReturnValue(of(null));
      const onSuccessMock = jest.fn();
      const onNotFoundMock = jest.fn();
      const onErrorMock = jest.fn();

      service.load('1', onSuccessMock, onNotFoundMock, onErrorMock);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Propuesta no encontrada',
        message: 'No se pudo encontrar la información de la propuesta solicitada.',
        type: NotificationType.ERROR,
      });
      expect(onNotFoundMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });

    it('debe notificar y ejecutar onError si ocurre un error HTTP', () => {
      mockProposalService.getProposalByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));
      const onSuccessMock = jest.fn();
      const onNotFoundMock = jest.fn();
      const onErrorMock = jest.fn();
      jest.spyOn(console, 'error').mockImplementation(() => {}); // Ocultar error de consola

      service.load('1', onSuccessMock, onNotFoundMock, onErrorMock);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de comunicación',
        message: 'Hubo un problema al conectar con el servidor. Intente más tarde.',
        type: NotificationType.ERROR,
      });
      expect(onErrorMock).toHaveBeenCalled();
      expect(onSuccessMock).not.toHaveBeenCalled();
    });
  });

  describe('handleMissingId', () => {
    it('debe notificar el error y ejecutar el callback onNavigate', () => {
      const onNavigateMock = jest.fn();

      service.handleMissingId(onNavigateMock);

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Acceso inválido',
        message: 'No se proporcionó un identificador válido para ver la propuesta.',
        type: NotificationType.ERROR,
      });
      expect(onNavigateMock).toHaveBeenCalled();
    });
  });

  describe('goBack', () => {
    it('debe navegar a /history si la url actual contiene /history', () => {
      mockRouter.url = '/history/123/details';
      service.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/history']);
    });

    it('debe navegar a /proposal si la url actual NO contiene /history', () => {
      mockRouter.url = '/some-other-path/123/details';
      service.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/proposal']);
    });
  });

  describe('Formateadores (getMemberName y getAuthors)', () => {
    it('getMemberName debe retornar "No asignado" si el usuario es indefinido', () => {
      expect(service.getMemberName(undefined)).toBe('No asignado');
    });

    it('getMemberName debe concatenar los nombres ignorando nulos o vacíos', () => {
      const user = { firstName: 'Maria', secondName: '', lastName: 'Lopez' } as unknown as User;
      expect(service.getMemberName(user)).toBe('Maria Lopez');
    });

    it('getAuthors debe delegar la tarea a UserService', () => {
      mockUserService.getAuthorsNames.mockReturnValue('Autor1 y Autor2');
      const authors = [mockUser];

      const result = service.getAuthors(authors);

      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith(authors);
      expect(result).toBe('Autor1 y Autor2');
    });
  });
});
