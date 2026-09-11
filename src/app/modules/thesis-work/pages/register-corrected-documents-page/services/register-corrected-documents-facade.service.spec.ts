// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { RegisterCorrectedDocumentsFacadeService } from './register-corrected-documents-facade.service';

// 3. Dependencias (Servicios)
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  uploadCorrectedDocumentsMock: jest.Mock<Observable<void>, [string, File, File]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
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
  codeNumber: 1234567890, // Estructura actualizada
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123', // Estructura actualizada en la raíz
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterCorrectedDocumentsFacadeService', () => {
  let service: RegisterCorrectedDocumentsFacadeService;

  // Mocks con interfaces estrictas
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización limpia sin as unknown
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      uploadCorrectedDocumentsMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentsFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterCorrectedDocumentsFacadeService);
  });

  // LIMPIEZA VITAL: Previene que el historial de llamadas contamine al siguiente
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería ejecutar onSuccess si el proyecto se carga correctamente', () => {
      // Arrange
      const mockThesis = createMockThesisWork({ thesisWorkId: '123' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería notificar y ejecutar onError si el servicio retorna nulo', () => {
      // Arrange (Tipado exacto permite of(null) sin casteos asquerosos)
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto solicitado no existe.',
        type: NotificationType.INFO
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error técnico y ejecutar onError si falla la petición', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de conexión',
        message: 'Fallo técnico al recuperar los datos.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Carga de Correcciones (processCorrectedDocuments)', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), annexes: new File([''], 'a.zip') };

    it('debería notificar éxito y ejecutar onSuccess si se guardan los documentos', () => {
      // Arrange
      thesisWorkServiceMock.uploadCorrectedDocumentsMock.mockReturnValue(of(void 0));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processCorrectedDocuments('123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.uploadCorrectedDocumentsMock).toHaveBeenCalledWith('123', mockFiles.monograph, mockFiles.annexes);
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: '¡Documentos Registrados!',
        message: 'La monografía corregida ha sido cargada exitosamente.',
        type: NotificationType.CONFIRMATION
      });
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería notificar error y ejecutar onError si falla la subida', () => {
      // Arrange
      thesisWorkServiceMock.uploadCorrectedDocumentsMock.mockReturnValue(throwError(() => new Error('Error de red')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processCorrectedDocuments('123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'No se pudo guardar la documentación corregida.',
        type: NotificationType.ERROR
      });
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
    });
  });

  describe('Navegación Fallida (showNavigationError)', () => {
    it('debería mostrar la notificación de error de navegación', () => {
      // Act
      service.showNavigationError();

      // Assert
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
