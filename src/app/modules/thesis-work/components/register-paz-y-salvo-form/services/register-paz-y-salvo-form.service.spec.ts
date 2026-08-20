import { TestBed } from '@angular/core/testing';
import { RegisterPazYSalvoFormService } from './register-paz-y-salvo-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';

// Utilidad para tipar profundamente mocks sin usar 'any' ni 'unknown'
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

describe('RegisterPazYSalvoFormService', () => {
  let service: RegisterPazYSalvoFormService;

  // Tipados estrictos sin as unknown as ...
  let notificationMock: { show: jest.Mock };
  let participantsMock: {
    getStudentNames: jest.Mock;
    getDirectorName: jest.Mock;
    getCodirectorName: jest.Mock;
    getAdvisorName: jest.Mock;
  };
  let documentResolverMock: { resolveLatestFinalDeliveryDocument: jest.Mock };

  const mockThesisWork: DeepPartial<ThesisWork> = { thesisWorkId: '123' };

  beforeEach(() => {
    // Arrange: Inicialización limpia de mocks
    notificationMock = { show: jest.fn() };

    participantsMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1'),
    };

    documentResolverMock = {
      resolveLatestFinalDeliveryDocument: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterPazYSalvoFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: documentResolverMock },
      ]
    });

    service = TestBed.inject(RegisterPazYSalvoFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Delegación de participantes', () => {
    it('debería obtener nombres delegando al formateador', () => {
      // Act
      const student = service.getStudentNames(mockThesisWork as ThesisWork);
      const director = service.getDirectorName(mockThesisWork as ThesisWork);
      const codirector = service.getCodirectorName(mockThesisWork as ThesisWork);
      const advisor = service.getAdvisorName(mockThesisWork as ThesisWork);

      // Assert
      expect(student).toBe('Estudiante 1');
      expect(director).toBe('Director 1');
      expect(codirector).toBe('Codirector 1');
      expect(advisor).toBe('Asesor 1');

      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('getExistingDocument()', () => {
    it('debería resolver MONOGRAFIA correctamente delegando en el resolver', () => {
      // Arrange
      const mockDoc: DeepPartial<FileDocument> = { id: 'doc1' };
      documentResolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(mockDoc);

      // Act
      const result = service.getExistingDocument(mockThesisWork as ThesisWork, 'monografia');

      // Assert
      expect(result).toEqual(mockDoc);
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesisWork, 'MONOGRAFIA');
    });

    it('debería normalizar FORMATO a FORMATO_E y resolverlo', () => {
      // Arrange
      documentResolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(null);

      // Act
      service.getExistingDocument(mockThesisWork as ThesisWork, 'formato');

      // Assert
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesisWork, 'FORMATO_E');
    });

    it('debería retornar null para un tipo de documento no válido sin llamar al resolver', () => {
      // Act
      const result = service.getExistingDocument(mockThesisWork as ThesisWork, 'INVALIDO');

      // Assert
      expect(result).toBeNull();
      expect(documentResolverMock.resolveLatestFinalDeliveryDocument).not.toHaveBeenCalled();
    });
  });

  describe('Notificaciones', () => {
    it('notifyFileAttached() debería emitir una notificación de tipo INFO', () => {
      // Act
      service.notifyFileAttached('archivo.pdf');

      // Assert
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El documento archivo.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('notifyMissingEvaluations() debería emitir notificación estricta de ERROR por falta de evaluación', () => {
      // Act
      service.notifyMissingEvaluations();

      // Assert (Validación estricta de todo el objeto)
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Faltan evaluaciones',
        message: 'Debe marcar si cumple o no cumple en ambas revisiones (Académica y Financiera).',
        type: NotificationType.ERROR
      });
    });

    it('notifyMissingDocument() debería emitir notificación estricta de ERROR por falta de documento', () => {
      // Act
      service.notifyMissingDocument();

      // Assert (Validación estricta de todo el objeto)
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Documento faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Paz y Salvo firmado.',
        type: NotificationType.ERROR
      });
    });
  });
});
