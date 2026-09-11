// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { UploadFinalDeliveryFacadeService } from './upload-final-delivery-facade.service';

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

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'DeepPartial') ────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null>, [string]>;
  uploadFinalDeliveryMock: jest.Mock<Observable<void>, [string, File, File, File | undefined]>;
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
        title: 'Título de Prueba',
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

describe('UploadFinalDeliveryFacadeService', () => {
  let service: UploadFinalDeliveryFacadeService;

  // Tipado estricto de espías sin usar casteos 'unknown'
  let thesisWorkServiceSpy: MockThesisWorkService;
  let notificationServiceSpy: MockNotificationService;

  // Fábrica en lugar de DeepPartial
  const mockThesis = createMockThesisWork({ thesisWorkId: 'thesis-123' });

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange general: Inicialización de espías estrictos
    thesisWorkServiceSpy = {
      getThesisWorkByIdMock: jest.fn(),
      uploadFinalDeliveryMock: jest.fn()
    };

    notificationServiceSpy = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        UploadFinalDeliveryFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceSpy },
        { provide: NotificationService, useValue: notificationServiceSpy }
      ]
    });

    service = TestBed.inject(UploadFinalDeliveryFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Carga de Trabajo de Grado (loadThesisWork)', () => {
    it('debe ejecutar onSuccess cuando se encuentra la tesis', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(mockThesis));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(thesisWorkServiceSpy.getThesisWorkByIdMock).toHaveBeenCalledWith('thesis-123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockThesis);
      expect(onNotFoundSpy).not.toHaveBeenCalled();
    });

    it('debe notificar "No encontrado" y ejecutar onNotFound si los datos son nulos/indefinidos', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(of(null));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('invalid-id', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'No encontrado',
        message: 'El proyecto solicitado no existe.',
        type: NotificationType.INFO
      });
    });

    it('debe notificar "Error de conexión" y ejecutar onNotFound en caso de error HTTP/Observable', () => {
      // Arrange
      thesisWorkServiceSpy.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('Net Error')));
      const onSuccessSpy = jest.fn();
      const onNotFoundSpy = jest.fn();

      // Act
      service.loadThesisWork('thesis-123', onSuccessSpy, onNotFoundSpy);

      // Assert
      expect(onNotFoundSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de conexión',
        message: 'Fallo técnico al recuperar los datos.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Proceso de Entrega Final (processFinalDelivery)', () => {
    const mockFiles = {
      monograph: new File([], 'm.pdf'),
      formatE: new File([], 'f.pdf'),
      annexes: new File([], 'a.pdf')
    };

    it('debe notificar éxito y llamar a onSuccess cuando se guarda la entrega correctamente', () => {
      // Arrange
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(of(void 0));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceSpy.uploadFinalDeliveryMock).toHaveBeenCalledWith(
        'thesis-123',
        mockFiles.monograph,
        mockFiles.formatE,
        mockFiles.annexes
      );
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: '¡Entrega Registrada!',
        message: 'La monografía, el Formato_E y los anexos se han procesado de manera oficial.',
        type: NotificationType.CONFIRMATION
      });
    });

    it('debe notificar error y llamar a onError si falla la carga de la entrega', () => {
      // Arrange
      thesisWorkServiceSpy.uploadFinalDeliveryMock.mockReturnValue(throwError(() => new Error('Error de servidor')));
      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processFinalDelivery('thesis-123', mockFiles, onSuccessSpy, onErrorSpy);

      // Assert
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error al guardar',
        message: 'No se pudo guardar la entrega final.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Errores de Navegación (showNavigationError)', () => {
    it('debe mostrar la notificación con título "Error de navegación" y el mensaje correcto', () => {
      // Act
      service.showNavigationError();

      // Assert
      expect(notificationServiceSpy.show).toHaveBeenCalledWith({
        title: 'Error de navegación',
        message: 'No se pudo identificar el identificador del trabajo de grado.',
        type: NotificationType.ERROR
      });
    });
  });
});
