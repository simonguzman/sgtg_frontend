import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError, Observable } from 'rxjs';
import { RegisterCorrespondenceFacadeService } from './register-correspondence-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

jest.mock('../../../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn().mockReturnValue('30/07/2026')
}));

jest.mock('../../../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));

interface MockThesisWorkService {
  getThesisWorkByIdMock: jest.Mock<Observable<ThesisWork | null | undefined>, [string]>;
  registerCorrespondenceDocumentMock: jest.Mock<Observable<void>, [string, FileDocument]>;
}

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

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
    thesisWorkId: 'tw-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.APROBADO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
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

describe('RegisterCorrespondenceFacadeService', () => {
  let service: RegisterCorrespondenceFacadeService;

  let thesisWorkServiceMock: MockThesisWorkService;
  let notificationServiceMock: MockNotificationService;

  beforeAll(() => {
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('1234abcd-5678-efgh') }
    });
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    thesisWorkServiceMock = {
      getThesisWorkByIdMock: jest.fn(),
      registerCorrespondenceDocumentMock: jest.fn(),
    };

    notificationServiceMock = {
      show: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrespondenceFacadeService,
        { provide: ThesisWorkService, useValue: thesisWorkServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock }
      ]
    });

    service = TestBed.inject(RegisterCorrespondenceFacadeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Carga de Trabajo de Grado (loadThesisWork)', () => {
    it('debería ejecutar onSuccess cuando se encuentra el trabajo de grado', () => {
      const mockData = createMockThesisWork();
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(mockData));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).toHaveBeenCalledWith(mockData);
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
    });

    it('debería mostrar error y ejecutar onError si el trabajo no existe (data nulo)', () => {
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Registro inexistente',
        message: 'El trabajo de grado solicitado no existe.',
        type: NotificationType.ERROR
      });
    });

    it('debería mostrar error y ejecutar onError si la petición falla', () => {
      const errorInstance = new Error('API Error');
      thesisWorkServiceMock.getThesisWorkByIdMock.mockReturnValue(throwError(() => errorInstance));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('tw-1', onSuccessSpy, onErrorSpy);

      expect(console.error).toHaveBeenCalledWith(errorInstance);
      expect(onErrorSpy).toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'Hubo un problema al recuperar los detalles.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('Procesamiento de Correspondencia (processCorrespondence)', () => {
    const mockFile = new File([''], 'resolucion.pdf', { type: 'application/pdf' });
    const mockBase64Url = 'data:application/pdf;base64,mockedContent123';

    it('debería construir el payload correctamente y ejecutar onSuccess en éxito', fakeAsync(() => {
      (readFileAsDataUrl as jest.Mock).mockResolvedValue(mockBase64Url);
      thesisWorkServiceMock.registerCorrespondenceDocumentMock.mockReturnValue(of(void 0));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);
      tick();

      const expectedDocument: FileDocument = {
        id: '1234abcd-5678-efgh',
        name: 'resolucion',
        url: mockBase64Url,
        uploadDate: '30/07/2026',
        type: DocumentType.FORMATO_H,
        status: stateList.APROBADO
      };

      expect(thesisWorkServiceMock.registerCorrespondenceDocumentMock).toHaveBeenCalledWith('tw-1', expectedDocument);
      expect(onSuccessSpy).toHaveBeenCalled();
      expect(onErrorSpy).not.toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: '¡Trabajo de Grado Concluido!',
        message: 'El formato H ha sido asentado correctamente. El proceso se encuentra formalmente cerrado.',
        type: NotificationType.CONFIRMATION
      });
    }));

    it('debería ejecutar onError y mostrar notificación si falla la lectura del archivo', fakeAsync(() => {
      const fileError = new Error('File Read Error');
      (readFileAsDataUrl as jest.Mock).mockRejectedValue(fileError);

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);
      tick();

      expect(console.error).toHaveBeenCalledWith('Error leyendo el archivo de correspondencia:', fileError);
      expect(thesisWorkServiceMock.registerCorrespondenceDocumentMock).not.toHaveBeenCalled();
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error al leer el archivo',
        message: 'No se pudo procesar el documento seleccionado.',
        type: NotificationType.ERROR
      });
    }));

    it('debería ejecutar onError y mostrar notificación de error si el guardado en API falla', fakeAsync(() => {
      const saveError = new Error('Save Error');
      (readFileAsDataUrl as jest.Mock).mockResolvedValue(mockBase64Url);
      thesisWorkServiceMock.registerCorrespondenceDocumentMock.mockReturnValue(throwError(() => saveError));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processCorrespondence('tw-1', mockFile, onSuccessSpy, onErrorSpy);
      tick();

      expect(console.error).toHaveBeenCalledWith(saveError);
      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error en guardado',
        message: 'No se pudo registrar la correspondencia final.',
        type: NotificationType.ERROR
      });
    }));
  });

  describe('Errores de Navegación (showNavigationError)', () => {
    it('debería llamar a notificationService con el error de navegación', () => {
      service.showNavigationError();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Identificador faltante',
        message: 'No se pudo procesar la vista por falta de un ID válido.',
        type: NotificationType.ERROR
      });
    });
  });
});
