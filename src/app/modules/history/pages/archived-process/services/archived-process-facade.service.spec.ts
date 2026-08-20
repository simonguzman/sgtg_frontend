import { TestBed } from '@angular/core/testing';
import { ArchivedProcessFacadeService } from './archived-process-facade.service';

import { UserService } from '../../../../users/services/user.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ArchivedRecordResolverService, ArchivedRecordType } from './archived-record-resolver.service';

import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { ArchivedRecordView } from '../interfaces/archived-record-view.interface';

describe('ArchivedProcessFacadeService', () => {
  let facadeService: ArchivedProcessFacadeService;

  // Mocks estrictamente tipados usando jest.Mocked para un autocompletado correcto
  let mockResolverService: jest.Mocked<Partial<ArchivedRecordResolverService>>;
  let mockUserService: jest.Mocked<Partial<UserService>>;
  let mockDownloadService: jest.Mocked<Partial<FileDownloadService>>;
  let mockNotificationService: jest.Mocked<Partial<NotificationService>>;

  // Tipo simulado genérico para la prueba
  const mockRecordType = 'TEST_TYPE' as unknown as ArchivedRecordType;

  beforeEach(() => {
    mockResolverService = { resolve: jest.fn() };
    mockUserService = { getAuthorsNames: jest.fn(), formatFullName: jest.fn() };
    mockDownloadService = { download: jest.fn() };
    mockNotificationService = { show: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        ArchivedProcessFacadeService,
        { provide: ArchivedRecordResolverService, useValue: mockResolverService },
        { provide: UserService, useValue: mockUserService },
        { provide: FileDownloadService, useValue: mockDownloadService },
        { provide: NotificationService, useValue: mockNotificationService },
      ],
    });

    facadeService = TestBed.inject(ArchivedProcessFacadeService);

    // Espiamos console.error para evitar ensuciar la consola durante las pruebas de fallo
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadRecord', () => {
    it('debería retornar null si el resolver no encuentra el registro', () => {
      (mockResolverService.resolve as jest.Mock).mockReturnValue(null);

      const result = facadeService.loadRecord(mockRecordType, 'id-123');
      expect(result).toBeNull();
      expect(mockResolverService.resolve).toHaveBeenCalledWith(mockRecordType, 'id-123');
    });

    it('debería mapear correctamente un registro completo', () => {
      const mockRawData = {
        baseProposal: {
          title: 'Sistema de Información',
          modality: 'Desarrollo Tecnológico',
          authors: [{ id: 'a1' }],
          director: { id: 'd1', firstName: 'Juan' },
          codirector: { id: 'c1', firstName: 'Ana' },
          advisor: { id: 'adv1', firstName: 'Luis' },
        },
        state: 'APROBADO',
        documents: [{ name: 'Documento1', url: 'http://test.url' } as FileDocument],
      };

      (mockResolverService.resolve as jest.Mock).mockReturnValue(mockRawData);

      (mockUserService.getAuthorsNames as jest.Mock).mockReturnValue('Autor Estudiante');
      (mockUserService.formatFullName as jest.Mock).mockImplementation((user) => {
        if (user.id === 'd1') return 'Juan Director';
        if (user.id === 'c1') return 'Ana Codirectora';
        if (user.id === 'adv1') return 'Luis Asesor';
        return '';
      });

      const result = facadeService.loadRecord(mockRecordType, 'id-123');

      const expectedView: ArchivedRecordView = {
        title: 'Sistema de Información',
        modality: 'Desarrollo Tecnológico',
        status: 'APROBADO',
        studentName: 'Autor Estudiante',
        directorName: 'Juan Director',
        codirectorName: 'Ana Codirectora',
        advisorName: 'Luis Asesor',
        documents: mockRawData.documents,
      };

      expect(result).toEqual(expectedView);
    });

    it('debería asignar valores por defecto (fallbacks) cuando falte información opcional', () => {
      const mockRawData = {
        baseProposal: {}, // Sin datos opcionales
        documents: [],
      };

      (mockResolverService.resolve as jest.Mock).mockReturnValue(mockRawData);
      (mockUserService.getAuthorsNames as jest.Mock).mockReturnValue('');

      const result = facadeService.loadRecord(mockRecordType, 'id-123');

      const expectedView: ArchivedRecordView = {
        title: 'Sin título registrado',
        modality: 'No definida',
        status: 'Desconocido',
        studentName: 'Sin estudiante asignado',
        directorName: 'Sin director asignado',
        codirectorName: undefined,
        advisorName: undefined,
        documents: [],
      };

      expect(result).toEqual(expectedView);
    });
  });

  describe('Manejo de Errores Visuales (Notificaciones)', () => {
    it('showNotFoundError: debería mostrar notificación de error correcta', () => {
      facadeService.showNotFoundError();

      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Registro no encontrado',
        message: 'No se pudo cargar la información histórica solicitada.',
        type: NotificationType.ERROR,
      });
    });

    it('showInvalidRouteError: debería mostrar notificación de ruta inválida', () => {
      facadeService.showInvalidRouteError();

      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Ruta inválida',
        message: 'No se pudo identificar el tipo o el identificador del registro histórico.',
        type: NotificationType.ERROR,
      });
    });
  });

  describe('downloadDocument', () => {
    it('debería mostrar un error y no llamar al servicio de descarga si el documento no tiene URL', async () => {
      const invalidDocument: FileDocument = { name: 'Doc Sin URL' } as FileDocument;

      await facadeService.downloadDocument(invalidDocument);

      expect(mockDownloadService.download).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No existe una URL válida vinculada a este archivo histórico.',
        type: NotificationType.ERROR,
      });
    });

    it('debería delegar la descarga exitosamente concatenando ".pdf" al nombre', async () => {
      const validDocument: FileDocument = { name: 'Acta_Final', url: 'https://storage/acta' } as FileDocument;

      // Simulamos que la promesa se resuelve correctamente
      (mockDownloadService.download as jest.Mock).mockResolvedValue(undefined);

      await facadeService.downloadDocument(validDocument);

      expect(mockNotificationService.show).not.toHaveBeenCalled();
      expect(mockDownloadService.download).toHaveBeenCalledTimes(1);
      expect(mockDownloadService.download).toHaveBeenCalledWith('https://storage/acta', 'Acta_Final.pdf');
    });

    it('debería capturar el error (try/catch), loguearlo y mostrar notificación si la descarga falla', async () => {
      const validDocument: FileDocument = { name: 'Acta_Corrupta', url: 'https://storage/error' } as FileDocument;
      const mockError = new Error('Network timeout');

      // Simulamos que la promesa es rechazada (simulando fallo de red o del servidor)
      (mockDownloadService.download as jest.Mock).mockRejectedValue(mockError);

      await facadeService.downloadDocument(validDocument);

      // Verificamos que se intentó descargar
      expect(mockDownloadService.download).toHaveBeenCalledWith('https://storage/error', 'Acta_Corrupta.pdf');

      // Verificamos que el error fue logueado en la consola
      expect(console.error).toHaveBeenCalledWith('Error al descargar el documento histórico Acta_Corrupta:', mockError);

      // Verificamos que el usuario recibió su feedback visual
      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Error de descarga',
        message: 'No se pudo descargar Acta_Corrupta. Intente más tarde.',
        type: NotificationType.ERROR
      });
    });
  });
});
