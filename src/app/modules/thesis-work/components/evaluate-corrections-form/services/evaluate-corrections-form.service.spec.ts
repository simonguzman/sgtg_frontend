import { TestBed } from '@angular/core/testing';
import { EvaluateCorrectionsFormService } from './evaluate-corrections-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { CorrectedDelivery } from '../../../interfaces/corrected-delivery.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

// --- Tipo utilitario para cero 'any' ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

describe('EvaluateCorrectionsFormService', () => {
  let service: EvaluateCorrectionsFormService;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let fileDownloadServiceMock: jest.Mocked<FileDownloadService>;
  let authServiceMock: { currentUser: jest.Mock<User | null, []> };
  let participantsFormatterMock: jest.Mocked<ThesisParticipantsFormatterService>;

  beforeEach(() => {
    notificationServiceMock = {
      show: jest.fn(),
    } as DeepPartial<NotificationService> as jest.Mocked<NotificationService>;

    fileDownloadServiceMock = {
      download: jest.fn().mockResolvedValue(undefined), // Importante para simular async correcto
    } as DeepPartial<FileDownloadService> as jest.Mocked<FileDownloadService>;

    authServiceMock = {
      currentUser: jest.fn(),
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn(),
    } as DeepPartial<ThesisParticipantsFormatterService> as jest.Mocked<ThesisParticipantsFormatterService>;

    TestBed.configureTestingModule({
      providers: [
        EvaluateCorrectionsFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: FileDownloadService, useValue: fileDownloadServiceMock },
        { provide: AuthService, useValue: authServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock },
      ],
    });

    service = TestBed.inject(EvaluateCorrectionsFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Prevenir fugas entre tests
  });

  describe('Delegación a ThesisParticipantsFormatterService', () => {
    const mockThesisWork = {} as DeepPartial<ThesisWork> as ThesisWork;

    it('debería delegar los nombres correctamente', () => {
      service.getStudentNames(mockThesisWork);
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);

      service.getDirectorName(mockThesisWork);
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);

      service.getCodirectorName(mockThesisWork);
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);

      service.getAdvisorName(mockThesisWork);
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar los jurados asignados extrayendo la sustentación', () => {
      const mockThesisWithSustentation = {
        sustentations: [{ id: 'sus-1' }]
      } as DeepPartial<ThesisWork> as ThesisWork;

      service.getAssignedJurors(mockThesisWithSustentation);
      expect(participantsFormatterMock.getAssignedJurors).toHaveBeenCalledWith(mockThesisWithSustentation.sustentations?.[0]);
    });
  });

  describe('Validaciones', () => {
    it('debería validar observaciones correctamente (mínimo 10 caracteres)', () => {
      expect(service.isObservationsValid('Corta')).toBe(false);
      expect(service.isObservationsValid('   Vacía   ')).toBe(false);
      expect(service.isObservationsValid('Esta es una observación válida')).toBe(true);
    });
  });

  describe('Construcción del Payload de Evaluación', () => {
    it('debería construir el payload correctamente con un usuario en sesión', () => {
      const mockUser = { id: 'u1', firstName: 'John', lastName: 'Doe' } as DeepPartial<User> as User;
      authServiceMock.currentUser.mockReturnValue(mockUser);

      const mockThesisWork = {
        preliminaryDraftData: { proposalData: { id: 'prop1' } }
      } as DeepPartial<ThesisWork> as ThesisWork;

      const mockDeliveries = [
        { monograph: { id: 'doc1' } }
      ] as DeepPartial<CorrectedDelivery[]> as CorrectedDelivery[];

      const payload = service.buildEvaluationPayload(mockThesisWork, stateList.APROBADO, 'Todo bien', mockDeliveries);

      expect(payload).toEqual({
        documentId: 'doc1',
        proposalId: 'prop1',
        evaluatorId: 'u1',
        evaluatorName: 'John Doe',
        evaluatorRole: 'JURADO',
        veredict: stateList.APROBADO,
        observations: 'Todo bien'
      });
    });

    it('debería manejar casos donde el usuario no esté en sesión o falten datos', () => {
      authServiceMock.currentUser.mockReturnValue(null);

      const payload = service.buildEvaluationPayload(
        {} as DeepPartial<ThesisWork> as ThesisWork,
        stateList.NO_APROBADO,
        'Falta info',
        []
      );

      expect(payload).toEqual({
        documentId: '',
        proposalId: '',
        evaluatorId: '',
        evaluatorName: 'Jurado Asignado',
        evaluatorRole: 'JURADO',
        veredict: stateList.NO_APROBADO,
        observations: 'Falta info'
      });
    });
  });

  describe('Descarga de documentos', () => {
    it('debería descargar el documento si tiene URL válida', async () => {
      const mockDoc = { url: 'http://test.com/doc.pdf', name: 'Documento' } as DeepPartial<FileDocument> as FileDocument;

      await service.downloadDocument(mockDoc);

      expect(fileDownloadServiceMock.download).toHaveBeenCalledWith('http://test.com/doc.pdf', 'Documento.pdf');
    });

    it('debería mostrar notificación de error si el documento no tiene URL', async () => {
      const mockDoc = { url: '', name: 'Documento' } as DeepPartial<FileDocument> as FileDocument;

      await service.downloadDocument(mockDoc);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR
      }));
      expect(fileDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('debería capturar la excepción y notificar el error si la descarga falla (catch block)', async () => {
      // Simular error en el API de descarga
      fileDownloadServiceMock.download.mockRejectedValueOnce(new Error('Network error'));
      const mockDoc = { url: 'http://test.com/doc.pdf', name: 'Documento' } as DeepPartial<FileDocument> as FileDocument;

      // Espiamos console.error para no ensuciar la salida del test (y verificamos que se llamó)
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      await service.downloadDocument(mockDoc);

      expect(consoleErrorSpy).toHaveBeenCalledWith(`Error al descargar el documento Documento:`, expect.any(Error));
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error de descarga',
        type: NotificationType.ERROR
      }));

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Notificaciones', () => {
    it('debería llamar a los métodos de notificación correctos', () => {
      service.notifyFileAttached();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.INFO }));

      service.notifyMissingVerdict();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));

      service.notifyInvalidObservations();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));

      service.notifyMissingFormatG();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({ type: NotificationType.ERROR }));
    });
  });
});
