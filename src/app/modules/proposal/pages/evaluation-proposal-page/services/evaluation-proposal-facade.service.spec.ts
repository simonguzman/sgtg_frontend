import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

import { EvaluationProposalFacadeService } from './evaluation-proposal-facade.service';
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

  let mockProposalService: jest.Mocked<ProposalService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockDownloadService: jest.Mocked<FileDownloadService>;
  let mockNotificationService: jest.Mocked<NotificationService>;
  let mockRouter: jest.Mocked<Router>;

  const mockCurrentUserSignal = signal<Partial<User> | null>(null);

  const mockUser: User = {
    id: 'evaluator-1',
    firstName: 'Carlos',
    lastName: 'Pérez',
    roles: ['DOCENTE']
  } as unknown as User;

  const mockProposal: Proposal = {
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
    mockCurrentUserSignal.set(mockUser);

    mockProposalService = {
      getProposalByIdMock: jest.fn(),
      addEvaluationMock: jest.fn()
    } as unknown as jest.Mocked<ProposalService>;

    mockAuthService = {
      currentUser: mockCurrentUserSignal
    } as unknown as jest.Mocked<AuthService>;

    mockUserService = {
      getUserFullName: jest.fn().mockReturnValue('Carlos Pérez')
    } as unknown as jest.Mocked<UserService>;

    mockDownloadService = {
      download: jest.fn()
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
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Método: load', () => {
    it('debería invocar onSuccess con la propuesta cuando getProposalByIdMock retorna datos', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalByIdMock.mockReturnValue(of(mockProposal));

      service.load('prop-100', onSuccess, onNotFound);

      expect(mockProposalService.getProposalByIdMock).toHaveBeenCalledWith('prop-100');
      expect(onSuccess).toHaveBeenCalledWith(mockProposal);
      expect(onNotFound).not.toHaveBeenCalled();
    });

    it('debería invocar onNotFound cuando getProposalByIdMock retorna null', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalByIdMock.mockReturnValue(of(null as unknown as Proposal));

      service.load('invalid-id', onSuccess, onNotFound);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onNotFound).toHaveBeenCalled();
    });

    it('debería invocar onNotFound cuando getProposalByIdMock emite un error', () => {
      const onSuccess = jest.fn();
      const onNotFound = jest.fn();
      mockProposalService.getProposalByIdMock.mockReturnValue(throwError(() => new Error('Server error')));

      service.load('error-id', onSuccess, onNotFound);

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onNotFound).toHaveBeenCalled();
    });
  });

  describe('Método: downloadOriginalDocument', () => {
    it('debería iniciar la descarga y notificar si el documento original tiene URL válida', () => {
      service.downloadOriginalDocument(mockProposal);

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

    it('debería notificar error si la propuesta no tiene documentos', () => {
      const emptyProposal = { ...mockProposal, documents: [] };

      service.downloadOriginalDocument(emptyProposal);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          type: NotificationType.ERROR
        })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });

    it('debería notificar error si el primer documento tiene una URL vacía o solo espacios', () => {
      const emptyUrlProposal = {
        ...mockProposal,
        documents: [{ name: 'A.pdf', url: '   ' } as FileDocument]
      };

      service.downloadOriginalDocument(emptyUrlProposal);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          type: NotificationType.ERROR
        })
      );
      expect(mockDownloadService.download).not.toHaveBeenCalled();
    });
  });

  describe('Método: saveEvaluation', () => {
    const mockRoute = {} as ActivatedRoute;
    const eventPayload = {
      result: 'Aprobado',
      comments: 'Excelente propuesta',
      signedFileName: 'evaluacion_firmada.pdf'
    };

    it('debería registrar la evaluación, notificar éxito y navegar al finalizar', () => {
      const onError = jest.fn();
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as any));

      service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockUserService.getUserFullName).toHaveBeenCalledWith('evaluator-1');
      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith('prop-100', expect.objectContaining({
        id: 'mock-uuid-9999',
        proposalId: 'prop-100',
        documentId: 'doc-1',
        evaluatorId: 'evaluator-1',
        evaluatorName: 'Carlos Pérez',
        evaluatorRole: 'DOCENTE',
        signedDocuments: ['evaluacion_firmada.pdf'],
        veredict: stateList.APROBADO,
        observations: 'Excelente propuesta'
      }));

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Evaluación registrada',
          type: NotificationType.CONFIRMATION
        })
      );
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../../'], { relativeTo: mockRoute });
      expect(onError).not.toHaveBeenCalled();
    });

    it('debería seleccionar el documento evaluable más reciente (PROPUESTA o CORRECCION)', () => {
      const onError = jest.fn();
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as any));

      const multiDocProposal: Proposal = {
        ...mockProposal,
        documents: [
          {
            id: 'doc-old',
            type: DocumentType.PROPUESTA,
            uploadDate: '2026-01-01T10:00:00.000Z'
          },
          {
            id: 'doc-newest',
            type: DocumentType.CORRECCION,
            uploadDate: '2026-03-01T10:00:00.000Z'
          }
        ] as FileDocument[]
      };

      service.saveEvaluation(eventPayload, multiDocProposal, mockRoute, onError);

      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith(
        'prop-100',
        expect.objectContaining({ documentId: 'doc-newest' })
      );
    });

    it('debería fallar si no hay un usuario autenticado', () => {
      const onError = jest.fn();
      mockCurrentUserSignal.set(null);

      service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.addEvaluationMock).not.toHaveBeenCalled();
    });

    it('debería fallar si la propuesta no tiene un ID o no tiene documentos evaluables', () => {
      const onError = jest.fn();
      const invalidProposal = { ...mockProposal, id: '', documents: [] };

      service.saveEvaluation(eventPayload, invalidProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.addEvaluationMock).not.toHaveBeenCalled();
    });

    it('debería usar la función de fallback para el rol y el estado si el veredicto no coincide con RESULT_TO_STATE', () => {
      const onError = jest.fn();
      mockCurrentUserSignal.set({ ...mockUser, roles: [] }); // Sin roles expresos
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as any));

      const unknownResultPayload = { ...eventPayload, result: 'Pendiente' };

      service.saveEvaluation(unknownResultPayload, mockProposal, mockRoute, onError);

      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith(
        'prop-100',
        expect.objectContaining({
          evaluatorRole: 'Evaluador',
          veredict: stateList.EN_REVISION // Mantiene el estado previo de la propuesta
        })
      );
    });

    it('debería notificar e invocar onError si addEvaluationMock falla', () => {
      const onError = jest.fn();
      mockProposalService.addEvaluationMock.mockReturnValue(throwError(() => new Error('Error al guardar')));

      service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
