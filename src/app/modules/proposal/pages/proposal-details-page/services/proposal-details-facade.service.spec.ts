import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProposalDetailsFacadeService } from './proposal-details-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { Proposal } from '../../../interfaces/proposal.interface';
import { aPropuesta } from '../../../../../core/mappers/trabajo-grado.mapper';
import { contextoDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoDePrueba, crearTrabajoEnAnteproyecto } from '../../../../../testing/trabajo-grado-de-prueba';
describe('ProposalDetailsFacadeService', () => {
  let service: ProposalDetailsFacadeService;
  let mockProposalService: { getProposalById: jest.Mock };
  let mockDownloadService: { download: jest.Mock };
  let mockNotificationService: { show: jest.Mock };
  let mockRouter: { url: string; navigate: jest.Mock };
  const mockProposal = { id: '1', title: 'Test Proposal' } as unknown as Proposal;
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    mockProposalService = {
      getProposalById: jest.fn(),
    };
    mockDownloadService = {
      download: jest.fn().mockResolvedValue(undefined),
    };
    mockNotificationService = {
      show: jest.fn(),
    };
    mockRouter = {
      url: '/proposal',
      navigate: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        ProposalDetailsFacadeService,
        { provide: ProposalService, useValue: mockProposalService as unknown as ProposalService },
        { provide: FileDownloadService, useValue: mockDownloadService as unknown as FileDownloadService },
        { provide: NotificationService, useValue: mockNotificationService as unknown as NotificationService },
        { provide: Router, useValue: mockRouter as unknown as Router },
      ],
    });
    service = TestBed.inject(ProposalDetailsFacadeService);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });
  describe('load', () => {
    it('debe ejecutar onSuccess si se encuentra la propuesta', () => {
      mockProposalService.getProposalById.mockReturnValue(of(mockProposal));
      const onSuccessMock = jest.fn();
      const onNotFoundMock = jest.fn();
      const onErrorMock = jest.fn();
      service.load('1', onSuccessMock, onNotFoundMock, onErrorMock);
      expect(mockProposalService.getProposalById).toHaveBeenCalledWith('1');
      expect(onSuccessMock).toHaveBeenCalledWith(mockProposal);
      expect(onNotFoundMock).not.toHaveBeenCalled();
      expect(mockNotificationService.show).not.toHaveBeenCalled();
    });
    it('debe notificar y ejecutar onNotFound si la respuesta es null', () => {
      mockProposalService.getProposalById.mockReturnValue(of(null));
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
      mockProposalService.getProposalById.mockReturnValue(throwError(() => new Error('Error de red')));
      const onSuccessMock = jest.fn();
      const onNotFoundMock = jest.fn();
      const onErrorMock = jest.fn();
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
  describe('buildView', () => {
    it('en revisión muestra la fecha de registro, el plazo del Comité y el formato A vigente', () => {
      const proposal = { ...aPropuesta(crearTrabajoDePrueba(), contextoDePrueba), evaluationRemainingDays: 4 };
      const view = service.buildView(proposal);

      expect(view.heading).toBe('Información de la propuesta');
      expect(view.state).toBe('En revisión');
      expect(view.dates).toEqual([
        { label: 'Fecha de registro', date: new Date(2026, 2, 2), hint: undefined },
        { label: 'Límite para el concepto del Comité', date: new Date(2026, 2, 16), hint: 'Quedan 4 días hábiles' }
      ]);
      expect(view.documents).toEqual([expect.objectContaining({
        name: 'Formato A (propuesta)', description: 'Versión vigente del formato A' })]);
    });

    it('aprobada ya no muestra el plazo del Comité; la práctica incluye la carta de aceptación', () => {
      const view = service.buildView(aPropuesta(crearTrabajoEnAnteproyecto({
        modalidad: 'PRACTICA_PROFESIONAL',
        cartaAceptacion: { tipo: 'CARTA_ACEPTACION', formato: null, ruta: '15/CARTA_ACEPTACION/v1/carta.pdf',
          version: 1, fechaCarga: '2026-03-02' }
      }), contextoDePrueba));

      expect(view.dates.map(fecha => fecha.label)).toEqual(['Fecha de registro']);
      expect(view.documents.map(documento => documento.name)).toEqual(['Formato A (propuesta)', 'Carta de aceptación']);
    });
  });

  describe('downloadDocument', () => {
    const documento = { name: 'Formato A (propuesta)', description: 'Vigente', url: '/api/a' };

    it('descarga el documento elegido', async () => {
      await service.downloadDocument(documento);
      expect(mockDownloadService.download).toHaveBeenCalledWith('/api/a', 'Formato A (propuesta)');
    });

    it('avisa si la descarga falla', async () => {
      mockDownloadService.download.mockRejectedValue(new Error('red'));
      await service.downloadDocument(documento);
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga', type: NotificationType.ERROR }));
    });
  });
});
