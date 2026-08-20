import { TestBed } from '@angular/core/testing';
import { UploadFinalDeliveryFormService } from './upload-final-delivery-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

describe('UploadFinalDeliveryFormService', () => {
  let service: UploadFinalDeliveryFormService;

  // Espías tipados estrictamente
  let notificationSpy: jest.Mocked<NotificationService>;
  let formatterSpy: jest.Mocked<ThesisParticipantsFormatterService>;

  beforeEach(() => {
    // Arrange: Configuración de espías
    notificationSpy = {
      show: jest.fn()
    } as unknown as jest.Mocked<NotificationService>;

    formatterSpy = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn()
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;

    TestBed.configureTestingModule({
      providers: [
        UploadFinalDeliveryFormService,
        { provide: NotificationService, useValue: notificationSpy },
        { provide: ThesisParticipantsFormatterService, useValue: formatterSpy }
      ]
    });

    service = TestBed.inject(UploadFinalDeliveryFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Delegación de Formato de Participantes', () => {
    // Arrange general para este bloque de pruebas
    const mockThesis = { id: 't-1' } as unknown as ThesisWork;

    it('debe delegar getStudentNames al formatter', () => {
      // Arrange
      formatterSpy.getStudentNames.mockReturnValue('Estudiante 1');

      // Act
      const result = service.getStudentNames(mockThesis);

      // Assert
      expect(result).toBe('Estudiante 1');
      expect(formatterSpy.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getDirectorName al formatter', () => {
      // Arrange
      formatterSpy.getDirectorName.mockReturnValue('Director 1');

      // Act
      const result = service.getDirectorName(mockThesis);

      // Assert
      expect(result).toBe('Director 1');
      expect(formatterSpy.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getCodirectorName al formatter', () => {
      // Arrange
      formatterSpy.getCodirectorName.mockReturnValue('Codirector 1');

      // Act
      const result = service.getCodirectorName(mockThesis);

      // Assert
      expect(result).toBe('Codirector 1');
      expect(formatterSpy.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe delegar getAdvisorName al formatter', () => {
      // Arrange
      formatterSpy.getAdvisorName.mockReturnValue('Asesor 1');

      // Act
      const result = service.getAdvisorName(mockThesis);

      // Assert
      expect(result).toBe('Asesor 1');
      expect(formatterSpy.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });

  describe('Notificaciones', () => {
    it('debe lanzar la notificación de archivo adjunto con el nombre correcto', () => {
      // Arrange
      const fileName = 'mi_archivo.pdf';

      // Act
      service.notifyFileAttached(fileName);

      // Assert: Se evalúa el objeto completo para mayor robustez
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: `El documento ${fileName} se ha adjuntado correctamente.`,
        type: NotificationType.INFO
      });
    });

    it('debe lanzar la notificación de error por documentos faltantes con el mensaje exacto', () => {
      // Act
      service.notifyMissingDocuments();

      // Assert: Se evalúa el objeto completo para asegurar que el mensaje no se modifique accidentalmente
      expect(notificationSpy.show).toHaveBeenCalledWith({
        title: 'Documentos faltantes',
        message: 'Debe adjuntar obligatoriamente la Monografía, el Formato_E y los Anexos para poder continuar.',
        type: NotificationType.ERROR
      });
    });
  });
});
