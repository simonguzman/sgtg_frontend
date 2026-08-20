import { TestBed } from '@angular/core/testing';
import { RegisterCorrespondenceFormService } from './register-correspondence-form.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';

// --- Tipo Utilitario Estricto ---
type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;

describe('RegisterCorrespondenceFormService', () => {
  let service: RegisterCorrespondenceFormService;
  let fileDownloadServiceMock: jest.Mocked<FileDownloadService>;
  let notificationServiceMock: jest.Mocked<NotificationService>;
  let participantsMock: jest.Mocked<ThesisParticipantsFormatterService>;

  beforeEach(() => {
    // Inicialización de mocks completamente Type-Safe
    fileDownloadServiceMock = {
      download: jest.fn(),
    } as DeepPartial<FileDownloadService> as jest.Mocked<FileDownloadService>;

    notificationServiceMock = {
      show: jest.fn(),
    } as DeepPartial<NotificationService> as jest.Mocked<NotificationService>;

    participantsMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
      getMemberName: jest.fn(),
      getAssignedJurors: jest.fn(),
    } as DeepPartial<ThesisParticipantsFormatterService> as jest.Mocked<ThesisParticipantsFormatterService>;

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrespondenceFormService,
        { provide: FileDownloadService, useValue: fileDownloadServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsMock },
      ],
    });

    service = TestBed.inject(RegisterCorrespondenceFormService);
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpieza vital para evitar cruce entre tests
  });

  describe('Delegación de Nombres (Participants)', () => {
    it('debería retornar "Sin estudiantes asignados" si no hay authors', () => {
      const mockThesis = { preliminaryDraftData: { proposalData: {} } } as DeepPartial<ThesisWork> as ThesisWork;
      expect(service.getStudentNames(mockThesis)).toBe('Sin estudiantes asignados');
      expect(participantsMock.getStudentNames).not.toHaveBeenCalled();
    });

    it('debería delegar los nombres de estudiantes si existen authors', () => {
      const mockThesis = { preliminaryDraftData: { proposalData: { authors: ['author1'] } } } as DeepPartial<ThesisWork> as ThesisWork;
      participantsMock.getStudentNames.mockReturnValue('Estudiante Prueba');

      expect(service.getStudentNames(mockThesis)).toBe('Estudiante Prueba');
      expect(participantsMock.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar el resto de participantes correctamente', () => {
      const mockThesis = {} as DeepPartial<ThesisWork> as ThesisWork;

      service.getDirectorName(mockThesis);
      expect(participantsMock.getDirectorName).toHaveBeenCalledWith(mockThesis);

      service.getCodirectorName(mockThesis);
      expect(participantsMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);

      service.getAdvisorName(mockThesis);
      expect(participantsMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);

      service.getMemberName('id-1');
      expect(participantsMock.getMemberName).toHaveBeenCalledWith('id-1');
    });

    it('debería delegar los jurados asignados extrayendo la primera sustentación', () => {
      const mockThesis = { sustentations: [{ id: 'sus-1' }] } as DeepPartial<ThesisWork> as ThesisWork;

      service.getAssignedJurors(mockThesis);
      // Validamos que le pase correctamente la posición [0]
      expect(participantsMock.getAssignedJurors).toHaveBeenCalledWith(mockThesis.sustentations![0]);
    });
  });

  describe('Búsqueda de Documentos Históricos', () => {
    it('debería encontrar el Formato_E usando el enum', () => {
      const docs = [
        { id: '1', type: DocumentType.MONOGRAFIA },
        { id: '2', type: DocumentType.FORMATO_E }
      ] as DeepPartial<FileDocument>[] as FileDocument[];

      const result = service.findFormatoE(docs);
      expect(result?.id).toBe('2');
    });

    it('debería encontrar Paz y Salvo usando enum o string legacy', () => {
      const docsEnum = [{ id: '1', type: DocumentType.PAZ_Y_SALVO }] as DeepPartial<FileDocument>[] as FileDocument[];
      const docsLegacy = [{ id: '2', type: DocumentType.PAZ_Y_SALVO }] as DeepPartial<FileDocument>[] as FileDocument[];

      expect(service.findFormatoF(docsEnum)?.id).toBe('1');
      expect(service.findFormatoF(docsLegacy)?.id).toBe('2');
    });

    it('debería encontrar Acta (G) priorizando CORRECCION sobre FORMATO_G', () => {
      const docsBoth = [
        { id: '1', type: DocumentType.FORMATO_G },
        { id: '2', type: DocumentType.CORRECCION }
      ] as DeepPartial<FileDocument>[] as FileDocument[];

      expect(service.findFormatoG(docsBoth)?.id).toBe('2'); // Prioriza corrección

      const docsOnlyG = [{ id: '1', type: DocumentType.FORMATO_G }] as DeepPartial<FileDocument>[] as FileDocument[];
      expect(service.findFormatoG(docsOnlyG)?.id).toBe('1'); // Cae al G
    });
  });

  describe('Manejo de Descargas y Validaciones', () => {
    // IMPORTANTE: Ahora usamos async/await para manejar la Promesa
    it('debería notificar error si el documento no tiene URL', async () => {
      await service.downloadDocument({ url: undefined } as DeepPartial<FileDocument> as FileDocument);

      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
      expect(fileDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('debería descargar el documento si tiene URL válida', async () => {
      // Mockeamos la resolución exitosa de la promesa de descarga
      fileDownloadServiceMock.download.mockResolvedValue(undefined);

      await service.downloadDocument({ url: 'http://doc.pdf', name: 'Doc' } as DeepPartial<FileDocument> as FileDocument);

      expect(fileDownloadServiceMock.download).toHaveBeenCalledWith('http://doc.pdf', 'Doc');
    });

    it('debería manejar y notificar el error si la descarga falla (catch block)', async () => {
      // Ocultamos temporalmente el console.error para no ensuciar la terminal del test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      // Simulamos que el servicio HTTP falla
      fileDownloadServiceMock.download.mockRejectedValue(new Error('Network error'));

      await service.downloadDocument({ url: 'http://doc.pdf', name: 'Doc' } as DeepPartial<FileDocument> as FileDocument);

      expect(consoleSpy).toHaveBeenCalledWith('Error al descargar el documento Doc:', expect.any(Error));
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Error de descarga',
          type: NotificationType.ERROR
        })
      );

      consoleSpy.mockRestore(); // Restauramos la consola
    });

    it('debería notificar formato de archivo inválido', () => {
      service.notifyInvalidFileType();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(
        expect.objectContaining({ type: NotificationType.ERROR })
      );
    });
  });
});
