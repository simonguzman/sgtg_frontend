// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { RegisterPazYSalvoFacadeService } from './register-paz-y-salvo-facade.service';

// 3. Dependencias (Servicios)
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../../interfaces/paz-y-salvo-playload.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ───────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null>, [string]>;
  registerPazYSalvoMock: jest.Mock<Observable<void>, [string, PazYSalvoPayload, File]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockFileDownloadService {
  download: jest.Mock<Promise<void>, [string, string]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

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
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: '123',
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
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título de Prueba',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => {
  const base: Partial<FileDocument> = {
    id: 'doc-1',
    name: 'documento_paz_y_salvo',
    url: 'http://test/doc.pdf',
    type: DocumentType.PAZ_Y_SALVO,
    uploadDate: new Date(),
    status: stateList.EN_REVISION,
    ...overrides
  };
  return base as FileDocument;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterPazYSalvoFacadeService', () => {
  let service: RegisterPazYSalvoFacadeService;

  // Tipado estricto de los mocks
  let mockThesisWorkService: MockThesisWorkService;
  let mockNotificationService: MockNotificationService;
  let mockFileDownloadService: MockFileDownloadService;

  beforeEach(() => {
    // 🔕 Silenciar consola preventivamente global (para atrapar los console.error del catch)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Arrange: Inicialización limpia de mocks
    mockThesisWorkService = {
      getThesisWorkByIdMock: jest.fn(),
      registerPazYSalvoMock: jest.fn(),
    };

    mockNotificationService = {
      show: jest.fn()
    };

    mockFileDownloadService = {
      download: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterPazYSalvoFacadeService,
        { provide: ThesisWorkService, useValue: mockThesisWorkService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: FileDownloadService, useValue: mockFileDownloadService } // Agregado al provider
      ]
    });

    service = TestBed.inject(RegisterPazYSalvoFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería ejecutar onSuccess con los datos si la petición es exitosa y devuelve información', () => {
      const mockData = createMockThesisWork();
      mockThesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(mockData));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería ejecutar onError si la petición es exitosa (200 OK) pero devuelve null', () => {
      // Simula el caso del operador ternario: `data ? onSuccess(data) : onError()`
      mockThesisWorkService.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería ejecutar onError si la petición falla a nivel HTTP o de red', () => {
      mockThesisWorkService.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de conexión')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Procesamiento de Paz y Salvo (processPazYSalvo)', () => {
    const mockFile = new File([''], 'test.pdf');
    let onSuccessSpy: jest.Mock;
    let onErrorSpy: jest.Mock;

    beforeEach(() => {
      onSuccessSpy = jest.fn();
      onErrorSpy = jest.fn();
    });

    it('debería notificar CONFIRMATION y llamar onSuccess si se aprueban todos los rubros', () => {
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(of(void 0));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: true,
        financialComments: ''
      };

      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Paz y Salvo Aprobado',
        type: NotificationType.CONFIRMATION
      }));
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar INFO y llamar onSuccess si alguna evaluación no se aprueba (rechazo)', () => {
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(of(void 0));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: false, // Simulamos el rechazo
        financialComments: ''
      };

      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Paz y Salvo No Aprobado',
        type: NotificationType.INFO
      }));
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar ERROR y llamar onError si la petición falla al guardar', () => {
      mockThesisWorkService.registerPazYSalvoMock.mockReturnValue(throwError(() => new Error('Fallo en el servidor')));
      const payload: PazYSalvoPayload = {
        academicApproved: true,
        academicComments: '',
        financialApproved: true,
        financialComments: ''
      };

      service.processPazYSalvo('123', payload, mockFile, onSuccessSpy, onErrorSpy);

      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        type: NotificationType.ERROR
      }));
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Descarga de Archivos (downloadDocument)', () => {
    it('debería delegar al FileDownloadService si el documento tiene una URL válida', async () => {
      const mockDoc = createMockFileDocument({ url: 'http://test/valid.pdf', name: 'archivo_final' });
      mockFileDownloadService.download.mockResolvedValue();

      await service.downloadDocument(mockDoc);

      expect(mockFileDownloadService.download).toHaveBeenCalledWith('http://test/valid.pdf', 'archivo_final.pdf');
      expect(mockNotificationService.show).not.toHaveBeenCalled(); // No debe mostrar notificaciones de error
    });

    it('debería abortar la descarga y notificar ERROR si el documento no tiene URL', async () => {
      // Simula un documento mal formado o en un estado donde el backend no generó URL
      const mockDoc = createMockFileDocument({ url: '' });

      await service.downloadDocument(mockDoc);

      expect(mockFileDownloadService.download).not.toHaveBeenCalled();
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de descarga'
      }));
    });

    it('debería capturar la promesa rechazada, notificar y mantener el flujo vivo si la descarga falla', async () => {
      const mockDoc = createMockFileDocument({ name: 'archivo_fallido' });
      const downloadError = new Error('Network interruption');

      // Simulamos que la API del navegador rechaza la promesa
      mockFileDownloadService.download.mockRejectedValue(downloadError);

      await service.downloadDocument(mockDoc);

      // Verificamos que el error llegó a la consola silenciosamente
      expect(console.error).toHaveBeenCalledWith(`Error al descargar el documento archivo_fallido:`, downloadError);

      // Verificamos que se le informa al usuario
      expect(mockNotificationService.show).toHaveBeenCalledWith(expect.objectContaining({
        type: NotificationType.ERROR,
        title: 'Error de descarga',
        message: 'No se pudo descargar archivo_fallido. Intente más tarde.'
      }));
    });
  });
});
