import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { EvaluationProposalFacadeService, SaveProposalEvaluationEvent } from './evaluation-proposal-facade.service';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { UserService } from '../../../../users/services/user.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

import { Proposal } from '../../../interfaces/proposal.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';


describe('EvaluationProposalFacadeService', () => {
  let service: EvaluationProposalFacadeService;

  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  let mockProposalService: jest.Mocked<ProposalService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockDownloadService: jest.Mocked<FileDownloadService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockRouter: jest.Mocked<Router>;

  const mockCurrentUserSignal = signal<Partial<User> | null>(null);

  const mockUser = {
    id: 'evaluator-1',
    firstName: 'Carlos',
    lastName: 'Pérez',
    roles: ['DOCENTE']
  } as unknown as User;

  const mockProposal = {
    id: 'prop-100',
    title: 'Propuesta de prueba',
    state: stateList.EN_REVISION,
    documents: [
      {
        id: 'doc-1',
        name: 'PropuestaOriginal.pdf',
        url: 'https://storage.com/doc-1.pdf',
        type: DocumentType.PROPUESTA,
        uploadDate: '2026-01-10T10:00:00.000Z'
      } as FileDocument
    ]
  } as Proposal;

  beforeAll(() => {
    Object.defineProperty(globalThis, 'crypto', {
      value: { randomUUID: () => 'mock-uuid-9999' }
    });
  });

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockCurrentUserSignal.set(mockUser);

    mockProposalService = {
      getProposalById: jest.fn(),
      registerCommitteeDecision: jest.fn()
    } as unknown as jest.Mocked<ProposalService>;

    mockAuthService = {
      currentUser: mockCurrentUserSignal
    } as unknown as jest.Mocked<AuthService>;

    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Carlos Pérez')
    } as unknown as jest.Mocked<UserService>;

    mockDownloadService = {
      download: jest.fn().mockResolvedValue(undefined)
    } as unknown as jest.Mocked<FileDownloadService>;

    mockNotificationService = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    mockRouter = {
      navigate: jest.fn()
    } as unknown as jest.Mocked<Router>;

    TestBed.configureTestingModule({
      providers: [
        EvaluationProposalFacadeService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(EvaluationProposalFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Método: load', () => {
    it('debería invocar onSuccess con la propuesta cuando getProposalById retorna datos', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalById.mockReturnValue(of(mockProposal));

      service.load('prop-100', onSuccess, onNotFound);

      expect(mockProposalService.getProposalById).toHaveBeenCalledWith('prop-100');
      expect(onSuccess).toHaveBeenCalledWith(mockProposal);
      expect(onNotFound).not.toHaveBeenCalled();
    });

    it('debería invocar onNotFound cuando getProposalById retorna null', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalById.mockReturnValue(of(null as unknown as Proposal));

      service.load('invalid-id', onSuccess, onNotFound);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onNotFound).toHaveBeenCalled();
    });

    it('debería invocar onNotFound cuando getProposalById emite un error', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalById.mockReturnValue(throwError(() => new Error('Server error')));

      service.load('error-id', onSuccess, onNotFound);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onNotFound).toHaveBeenCalled();
    });
  });

  describe('Método: downloadOriginalDocument', () => {
    it('debería iniciar la descarga y notificar si el documento original tiene URL válida', async () => {
      await service.downloadOriginalDocument(mockProposal);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Descarga iniciada',
          type: NotificationType.INFO
        })
      );
      expect(mockDownloadService.download).toHaveBeenCalledWith(
        'https://storage.com/doc-1.pdf',
        'PropuestaOriginal.pdf'
      );
    });

    it('debería notificar error si la propuesta no tiene documentos', async () => {
      const emptyProposal = { ...mockProposal, documents: [] } as unknown as Proposal;

      await service.downloadOriginalDocument(emptyProposal);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          type: NotificationType.ERROR
        })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería notificar error si la descarga falla', async () => {
      mockDownloadService.download.mockRejectedValue(new Error('Network error'));

      await service.downloadOriginalDocument(mockProposal);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          type: NotificationType.ERROR
        })
      );
    });
  });

  describe('Método: saveEvaluation', () => {
    const mockRoute = {} as ActivatedRoute;

    const mockFile = new File(['contenido mock'], 'evaluacion_firmada.pdf', { type: 'application/pdf' });
    const eventPayload: SaveProposalEvaluationEvent = {
      result: 'Aprobado',
      comments: 'Excelente propuesta',
      file: mockFile
    };

    it('debería registrar el concepto del Comité, notificar éxito y navegar al finalizar', async () => {
      const onError = jest.fn();
      mockProposalService.registerCommitteeDecision.mockReturnValue(of({} as Proposal));

      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockProposalService.registerCommitteeDecision)
        .toHaveBeenCalledWith('prop-100', stateList.APROBADO, 'Excelente propuesta', mockFile);
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Evaluación registrada', type: NotificationType.CONFIRMATION })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRoute });
      expect(onError).not.toHaveBeenCalled();
    });

    it('debería enviar NO APROBADO cuando el Comité no aprueba', async () => {
      mockProposalService.registerCommitteeDecision.mockReturnValue(of({} as Proposal));

      await service.saveEvaluation({ ...eventPayload, result: 'No aprobado' }, mockProposal, mockRoute, jest.fn());

      expect(mockProposalService.registerCommitteeDecision)
        .toHaveBeenCalledWith('prop-100', stateList.NO_APROBADO, 'Excelente propuesta', mockFile);
    });

    it('debería fallar sin llamar al backend si la propuesta no tiene ID', async () => {
      const onError = jest.fn();

      await service.saveEvaluation(eventPayload, { ...mockProposal, id: '' } as Proposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.registerCommitteeDecision).not.toHaveBeenCalled();
    });

    it('debería fallar sin llamar al backend si el resultado no es un veredicto válido', async () => {
      const onError = jest.fn();

      await service.saveEvaluation({ ...eventPayload, result: 'Pendiente' }, mockProposal, mockRoute, onError);

      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.registerCommitteeDecision).not.toHaveBeenCalled();
    });

    it('debería mostrar el mensaje del backend e invocar onError si falla', async () => {
      const onError = jest.fn();
      mockProposalService.registerCommitteeDecision.mockReturnValue(throwError(() =>
        new HttpErrorResponse({ status: 400, error: { message: 'La propuesta no está radicada.' } })));

      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error al guardar la evaluación',
        message: 'La propuesta no está radicada.',
        type: NotificationType.ERROR
      }));
      expect(onError).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
