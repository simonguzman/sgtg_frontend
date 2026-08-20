import { TestBed } from '@angular/core/testing';
import { RegisterCorrectedDocumentFormService } from './register-corrected-document-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

describe('RegisterCorrectedDocumentFormService', () => {
  let service: RegisterCorrectedDocumentFormService;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let participantsFormatterMock: jest.Mocked<ThesisParticipantsFormatterService>;

  // Proveemos un objeto mínimo estructurado en lugar de un objeto completamente vacío
  const mockThesisWork = { thesisWorkId: '123' } as ThesisWork;

  beforeEach(() => {
    // Configuración estricta de mocks usando jest.Mocked y unknown
    notificationServiceMock = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    participantsFormatterMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1')
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(RegisterCorrectedDocumentFormService);
  });

  // Limpieza vital para evitar fugas de memoria y contaminación entre tests
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Formateadores de nombres', () => {
    it('debería delegar getStudentNames al participantsFormatter', () => {
      expect(service.getStudentNames(mockThesisWork)).toBe('Estudiante 1');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getDirectorName al participantsFormatter', () => {
      expect(service.getDirectorName(mockThesisWork)).toBe('Director 1');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getCodirectorName al participantsFormatter', () => {
      expect(service.getCodirectorName(mockThesisWork)).toBe('Codirector 1');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería delegar getAdvisorName al participantsFormatter', () => {
      expect(service.getAdvisorName(mockThesisWork)).toBe('Asesor 1');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Notificaciones', () => {
    it('debería notificar el archivo adjunto correctamente con nivel INFO', () => {
      service.notifyFileAttached('mi_archivo.pdf');

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El documento mi_archivo.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('debería notificar cuando faltan documentos con nivel ERROR', () => {
      service.notifyMissingDocuments();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Documentos faltantes',
        message: 'Debe adjuntar obligatoriamente la Monografía corregida y los Anexos para continuar.',
        type: NotificationType.ERROR
      });
    });
  });
});
