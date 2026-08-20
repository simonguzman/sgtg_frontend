import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { RegisterSustentationFacadeService } from './register-sustentation-facade.service';
import { ThesisWorkService } from '../../../services/thesis-work.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SustentationFormPayload } from '../../../components/register-sustentation-form/register-sustentation-form.component';

describe('RegisterSustentationFacadeService', () => {
  let service: RegisterSustentationFacadeService;

  // Usamos Partial para evitar el "as unknown as..." y mantener la seguridad de tipos
  let thesisWorkServiceMock: jest.Mocked<Partial<ThesisWorkService>>;
  let notificationServiceMock: jest.Mocked<Partial<NotificationService>>;

  beforeEach(() => {
    // Inicializamos los mocks con las funciones específicas que usamos
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
  });

  describe('loadThesisWork', () => {
    it('debería invocar onSuccess con los datos si la petición es exitosa', () => {
      const mockWork = { thesisWorkId: '123' } as ThesisWork;
      (thesisWorkServiceMock.getThesisWorkByIdMock as jest.Mock).mockReturnValue(of(mockWork));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(thesisWorkServiceMock.getThesisWorkByIdMock).toHaveBeenCalledWith('123');
      expect(onSuccessSpy).toHaveBeenCalledWith(mockWork);
      expect(onErrorSpy).not.toHaveBeenCalled();
    });

    it('debería invocar onError y mostrar notificación si retorna datos nulos/indefinidos', () => {
      (thesisWorkServiceMock.getThesisWorkByIdMock as jest.Mock).mockReturnValue(of(null));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se identificó el ID del Trabajo de Grado.',
        type: NotificationType.ERROR
      });
    });

    it('debería invocar onError y mostrar notificación si la petición falla (catch error)', () => {
      (thesisWorkServiceMock.getThesisWorkByIdMock as jest.Mock).mockReturnValue(
        throwError(() => new Error('API Error'))
      );

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.loadThesisWork('123', onSuccessSpy, onErrorSpy);

      expect(onSuccessSpy).not.toHaveBeenCalled();
      expect(onErrorSpy).toHaveBeenCalled();
      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Error',
        message: 'No se identificó el ID del Trabajo de Grado.',
        type: NotificationType.ERROR
      });
    });
  });

  describe('processSustentation', () => {
    const mockPayload: SustentationFormPayload = {
      sustentationDate: new Date('2026-10-10'),
      location: 'Auditorio',
      juror1: 'j1',
      juror2: 'j2'
    };
    const mockFile = new File([''], 'formato.pdf');

    it('debería combinar el payload y el archivo, llamar al servicio e invocar onSuccess si se guarda correctamente', () => {
      (thesisWorkServiceMock.saveSustentationRegistryMock as jest.Mock).mockReturnValue(of(undefined));

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSustentation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

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
      (thesisWorkServiceMock.saveSustentationRegistryMock as jest.Mock).mockReturnValue(
        throwError(() => new Error('API Error'))
      );

      const onSuccessSpy = jest.fn();
      const onErrorSpy = jest.fn();

      service.processSustentation('123', mockPayload, mockFile, onSuccessSpy, onErrorSpy);

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
