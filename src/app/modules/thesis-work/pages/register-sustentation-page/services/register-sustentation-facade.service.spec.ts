// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';

// 2. Servicio a probar
import { RegisterSustentationFacadeService } from './register-sustentation-facade.service';

// 3. Dependencias (Servicios)
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';

// 4. Interfaces y Enums
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationFormPayload } from '../../../components/register-sustentation-form/register-sustentation-form.component';
import { SustentationFormData } from '../../../interfaces/sustentation-form-data.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown', 'Partial') ──────────

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null>, [string]>;
  saveSustentationRegistryMock: jest.Mock<Observable<void>, [string, SustentationFormData]>;
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

describe('RegisterSustentationFacadeService', () => {
  let service: RegisterSustentationFacadeService;

  // Interfaces estrictas en lugar de Partial para evitar el "as jest.Mock"
  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicializamos los mocks cumpliendo su contrato estricto
    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      saveSustentationRegistryMock: jest.fn()
    };

    notificationServiceMock = {
      show: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterSustentationFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterSustentationFacadeService);
  });

  afterEach(() => {
    // Limpiamos los mocks para evitar fugas de estado entre pruebas
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Carga de Proyecto (loadThesisWork)', () => {
    it('debería invocar onSuccess con los datos si la petición es exitosa', () => {
      // Arrange
      const mockWork = createMockThesisWork({ thesisWorkId: '123' });
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockWork));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockWork);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería invocar onError y mostrar notificación si retorna datos nulos/indefinidos', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se identificó el ID del Trabajo de Grado.',
        type: NotificationType.ERROR
      });
    });

    it('debería invocar onError y mostrar notificación si la petición falla (catch error)', () => {
      // Arrange
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => new Error('API Error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      // Assert
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se identificó el ID del Trabajo de Grado.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Agendamiento de Sustentación (processSustentation)', () => {
    const mockPayload: SustentationFormPayload = {
      sustentationDate: new Date('2026-10-10'),
      location: 'Auditorio',
      juror1: 'j1',
      juror2: 'j2'
    };
    const mockFile = new File([''], 'formato.pdf');

    it('debería combinar el payload y el archivo, llamar al servicio e invocar onSuccess si se guarda correctamente', () => {
      // Arrange
      thesisWorkServiceMock.saveSustentationRegistryMock.mockReturnValue(of(void 0));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processSustentation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      // Verificamos que se haya ensamblado correctamente SustentationFormData
      expect(thesisWorkServiceMock.saveSustentationRegistryMock).toHaveBeenCalledWith('123', {
        ...mockPayload,
        formatEDocument: mockFile
      });

      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Sustentación Agendada',
        type: NotificationType.CONFIRMATION
      }));
    });

    it('debería invocar onError y mostrar notificación si el guardado falla', () => {
      // Arrange
      thesisWorkServiceMock.saveSustentationRegistryMock.mockReturnValue(throwError(() => new Error('API Error')));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      // Act
      service.processSustentation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

      // Assert
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Fallo al procesar el agendamiento.',
        type: NotificationType.ERROR
      });
    });
  });
});
