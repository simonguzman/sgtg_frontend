import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { EvaluateSustentationFacadeService } from './evaluate-sustentation-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { stateList } from '../../../../../core/enums/state.enum';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | undefined>, [string]>;
  registerSustentationVerdictMock: jest.Mock<Observable<void>, [string, SustentationEvaluationPayload, File]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'p-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título Mock',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

const createMockEvaluationPayload = (overrides: Partial<SustentationEvaluationPayload> = {}): SustentationEvaluationPayload => ({
  veredict: stateList.NO_APROBADO,
  observations: '',
  evaluationDate: new Date('2026-08-24T10:00:00'),
  ...overrides
});

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento_evidencia',
  url: 'http://docs/evidencia.pdf',
  uploadDate: new Date(),
  type: DocumentType.FORMATO_G,
  ...overrides
});

describe('EvaluateSustentationFacadeService', () => {
  let service: EvaluateSustentationFacadeService;

  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;
  let fileDownloadServiceMock: MockFileDownloadService;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      registerSustentationVerdictMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    fileDownloadServiceMock = {
      download: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSustentationFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: fileDownloadServiceMock }
      ]
    });

    service = TestBed.inject(EvaluateSustentationFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería invocar onSuccess si se carga el proyecto correctamente', () => {
      const mockThesis = createMockThesisWork({ thesisWorkId: '123' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería invocar onError si el servicio retorna undefined', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería mostrar notificación y llamar onError si falla la petición HTTP', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de carga',
        message: 'No se pudo recuperar la información del proyecto.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
    });
  });

  describe('Proceso de Evaluación (processEvaluation)', () => {
    const mockFile = new File([''], 'test.pdf');
    const mockPayload = createMockEvaluationPayload();

    it('debería registrar el veredicto, mostrar notificación específica y llamar onSuccess', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.registerSustentationVerdictMock).toHaveBeenCalledWith('123', mockPayload, mockFile);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Sustentación No Aprobada',
        message: `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${stateList.NO_APROBADO}].`,
        type: NotificationType.ERROR
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería usar la notificación por defecto si el veredicto no está en el config map', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(of(void 0));

      const defaultPayload = createMockEvaluationPayload({ veredict: stateList.APROBADO });

      service.processEvaluation('123', defaultPayload, mockFile, jest.fn(), jest.fn());

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Sustentación Evaluada',
        message: `El veredicto de la sustentación ha sido registrado correctamente bajo el estado de [${stateList.APROBADO}].`,
        type: NotificationType.CONFIRMATION
      });
    });

    it('debería mostrar notificación de error y llamar onError si falla la petición', () => {
      thesisWorkServiceMock.registerSustentationVerdictMock.mockReturnValue(throwError(() => new Error('Net error')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processEvaluation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de Red',
        message: 'Fallo la comunicación al almacenar la evaluación.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Descarga de Documento (downloadDocument) - Flujo asíncrono', () => {
    it('debería mostrar error y detenerse si el documento no tiene URL', async () => {
      const invalidDoc = createMockFileDocument({ url: undefined });

      await service.downloadDocument(invalidDoc);

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No existe una URL válida vinculada a este archivo.',
        type: NotificationType.ERROR
      });
      expect(fileDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('debería procesar la descarga exitosamente si tiene URL', async () => {
      const validDoc = createMockFileDocument({ name: 'documento_final', url: 'http://docs/final.pdf' });
      fileDownloadServiceMock.download.mockResolvedValue(undefined);

      await service.downloadDocument(validDoc);

      expect(fileDownloadServiceMock.download).toHaveBeenCalledWith('http://docs/final.pdf', 'documento_final.pdf');
    });

    it('debería atrapar la promesa rechazada de descarga, mostrar error en consola y emitir notificación', async () => {
      const validDoc = createMockFileDocument({ name: 'documento_roto', url: 'http://docs/roto.pdf' });
      fileDownloadServiceMock.download.mockRejectedValue(new Error('Network disconnected'));

      await service.downloadDocument(validDoc);

      expect(console.error).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No se pudo descargar documento_roto. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });
  });
});
