import { TestBed } from '@angular/core/testing';
import { EvaluateSustentationFormService } from './evaluate-sustentation-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisFinalDeliveryDocumentResolverService } from '../../../services/thesis-final-delivery-document-resolver.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { SustentationRegistry } from '../../../interfaces/sustentation-registry.interface';

describe('EvaluateSustentationFormService', () => {
  let service: EvaluateSustentationFormService;

  // Tipados estructurales exactos para evitar el uso de `any` o `as unknown as`
  let notificationMock: { show: jest.Mock };
  let participantsMock: {
    getStudentNames: jest.Mock;
    getDirectorName: jest.Mock;
    getCodirectorName: jest.Mock;
    getAdvisorName: jest.Mock;
    getAssignedJurors: jest.Mock;
  };
  let resolverMock: { resolveLatestFinalDeliveryDocument: jest.Mock };

  beforeEach(() => {
    notificationMock = { show: jest.fn() };

    participantsMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getAssignedJurors: jest.fn()
    };

    resolverMock = {
      resolveLatestFinalDeliveryDocument: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSustentationFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
        { provide: ThesisFinalDeliveryDocumentResolverService, useValue: resolverMock }
      ]
    });

    service = TestBed.inject(EvaluateSustentationFormService);
  });

  afterEach(() => {
    // Evita la contaminación de los mocks entre pruebas
    jest.clearAllMocks();
  });

  describe('Delegación de Nombres (Participants)', () => {
    // Objeto mock seguro
    const mockThesis = {} as ThesisWork;

    it('debería delegar la obtención de nombres de estudiantes y director al servicio formateador', () => {
      participantsMock.getStudentNames.mockReturnValue('Estudiante 1');
      expect(service.getStudentNames(mockThesis)).toBe('Estudiante 1');
      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesis);

      participantsMock.getDirectorName.mockReturnValue('Director 1');
      expect(service.getDirectorName(mockThesis)).toBe('Director 1');
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar la obtención de codirector y asesor al servicio formateador', () => {
      participantsMock.getCodirectorName.mockReturnValue('Codirector 1');
      expect(service.getCodirectorName(mockThesis)).toBe('Codirector 1');
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);

      participantsMock.getAdvisorName.mockReturnValue('Asesor 1');
      expect(service.getAdvisorName(mockThesis)).toBe('Asesor 1');
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar los jurados asignados correctamente', () => {
      const mockSustentation = {} as SustentationRegistry;
      participantsMock.getAssignedJurors.mockReturnValue('Jurado A, Jurado B');

      expect(service.getAssignedJurors(mockSustentation)).toBe('Jurado A, Jurado B');
      expect(participantsMock.getAssignedJurors).toHaveBeenCalledWith(mockSustentation);
    });
  });

  describe('Obtención de Documentos Existentes', () => {
    const mockThesis = {} as ThesisWork;

    it('debería resolver el documento si el tipo es MONOGRAFIA o ANEXOS (ignorando espacios y mayúsculas)', () => {
      const mockFile = { name: 'archivo.pdf' } as FileDocument;
      resolverMock.resolveLatestFinalDeliveryDocument.mockReturnValue(mockFile);

      const docMonografia = service.getExistingDocument(mockThesis, 'monografia ');
      expect(docMonografia).toEqual(mockFile);
      expect(resolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesis, 'MONOGRAFIA');

      const docAnexos = service.getExistingDocument(mockThesis, 'aNeXoS ');
      expect(docAnexos).toEqual(mockFile);
      expect(resolverMock.resolveLatestFinalDeliveryDocument).toHaveBeenCalledWith(mockThesis, 'ANEXOS');
    });

    it('debería retornar null si el tipo de documento no es permitido', () => {
      const doc = service.getExistingDocument(mockThesis, 'OTRO_TIPO');
      expect(doc).toBeNull();
      expect(resolverMock.resolveLatestFinalDeliveryDocument).not.toHaveBeenCalled();
    });
  });

  describe('Notificaciones', () => {
    it('debería mostrar notificación informativa al adjuntar archivo', () => {
      service.notifyFileAttached('acta.pdf');

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Archivo adjunto',
        message: 'El acta de sustentación acta.pdf se ha adjuntado correctamente.',
        type: NotificationType.INFO
      });
    });

    it('debería mostrar notificación de error al faltar calificación', () => {
      service.notifyMissingVerdict();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Falta calificación',
        message: 'Debe seleccionar obligatoriamente una calificación para la sustentación.',
        type: NotificationType.ERROR
      });
    });

    it('debería mostrar notificación de error al faltar formato', () => {
      service.notifyMissingFile();

      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Formato faltante',
        message: 'Debe adjuntar obligatoriamente el Formato de Sustentación con los resultados firmados.',
        type: NotificationType.ERROR
      });
    });
  });
});
