import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';
import { signal } from '@angular/core';

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

// 1. IMPORTANTE: Mockear la utilidad externa de lectura de archivos
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));

describe('EvaluationProposalFacadeService', () => {
  let service: EvaluationProposalFacadeService;

  // Espías globales para silenciar la consola
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
    // Silenciamos la consola para toda la suite
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Restaurar los mocks antes de cada prueba
    (readFileAsDataUrl as jest.Mock).mockReset();
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
    // 2. IMPORTANTE: Usar async/await porque el método es asíncrono
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

      // Utilizamos el espía global en lugar de uno local
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

    // 3. IMPORTANTE: Usar un objeto File real para emular el evento del DOM
    const mockFile = new File(['contenido mock'], 'evaluacion_firmada.pdf', { type: 'application/pdf' });
    const eventPayload: SaveProposalEvaluationEvent = {
      result: 'Aprobado',
      comments: 'Excelente propuesta',
      file: mockFile
    };

    it('debería registrar la evaluación, notificar éxito y navegar al finalizar', async () => {
      const onError = jest.fn();

      // Eliminamos el of({} as any) y lo tipamos correctamente
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as unknown as Proposal));

      // Simulamos la conversión de File a Base64
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mockUrl123');

      // Esperamos a que la promesa del facade se resuelva
      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockUserService.getUserFullName).toHaveBeenCalledWith('evaluator-1');
      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith('prop-100', expect.objectContaining({
        id: 'mock-uuid-9999',
        proposalId: 'prop-100',
        documentId: 'doc-1',
        evaluatorId: 'evaluator-1',
        evaluatorName: 'Carlos Pérez',
        evaluatorRole: 'DOCENTE',
        signedDocuments: [{ name: 'evaluacion_firmada.pdf', url: 'data:application/pdf;base64,mockUrl123' }],
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

    it('debería invocar onError si la lectura del archivo falla (readFileAsDataUrl)', async () => {
      const onError = jest.fn();

      // Simulamos que el utilitario falla al leer el archivo
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(new Error('File read error'));

      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      // Utilizamos el espía global
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error al leer el archivo', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.addEvaluationMock).not.toHaveBeenCalled();
    });

    it('debería seleccionar el documento evaluable más reciente (PROPUESTA o CORRECCION)', async () => {
      const onError = jest.fn();
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as unknown as Proposal));
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:mock');

      const multiDocProposal = {
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
      } as Proposal;

      await service.saveEvaluation(eventPayload, multiDocProposal, mockRoute, onError);

      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith(
        'prop-100',
        expect.objectContaining({ documentId: 'doc-newest' })
      );
    });

    it('debería fallar si no hay un usuario autenticado', async () => {
      const onError = jest.fn();
      mockCurrentUserSignal.set(null);

      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockProposalService.addEvaluationMock).not.toHaveBeenCalled();
    });

    it('debería fallar si la propuesta no tiene un ID o no tiene documentos evaluables', async () => {
      const onError = jest.fn();
      const invalidProposal = { ...mockProposal, id: '', documents: [] } as unknown as Proposal;

      await service.saveEvaluation(eventPayload, invalidProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
    });

    it('debería usar la función de fallback para el rol y el estado si el veredicto no coincide', async () => {
      const onError = jest.fn();
      mockCurrentUserSignal.set({ ...mockUser, roles: [] } as unknown as User); // Sin roles expresos
      mockProposalService.addEvaluationMock.mockReturnValue(of({} as unknown as Proposal));
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:mock');

      const unknownResultPayload: SaveProposalEvaluationEvent = { ...eventPayload, result: 'Pendiente' };

      await service.saveEvaluation(unknownResultPayload, mockProposal, mockRoute, onError);

      expect(mockProposalService.addEvaluationMock).toHaveBeenCalledWith(
        'prop-100',
        expect.objectContaining({
          evaluatorRole: 'Evaluador',
          veredict: stateList.EN_REVISION // Mantiene el estado previo de la propuesta
        })
      );
    });

    it('debería notificar e invocar onError si addEvaluationMock falla', async () => {
      const onError = jest.fn();
      (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:mock');
      mockProposalService.addEvaluationMock.mockReturnValue(throwError(() => new Error('Error al guardar')));

      await service.saveEvaluation(eventPayload, mockProposal, mockRoute, onError);

      expect(mockNotificationService.show).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Error de servidor', type: NotificationType.ERROR })
      );
      expect(onError).toHaveBeenCalled();
      expect(mockRouter.navigate).not.toHaveBeenCalled();
    });
  });
});
