import { TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestFormService } from './register-special-request-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

// --- Interfaces para Mocks Estrictos (Cero ANY y Cero Castings Forzados) ---
interface MockNotificationService {
  show: jest.Mock;
}

interface MockParticipantsFormatterService {
  getStudentNames: jest.Mock;
  getDirectorName: jest.Mock;
  getCodirectorName: jest.Mock;
  getAdvisorName: jest.Mock;
}

describe('RegisterSpecialRequestFormService', () => {
  let service: RegisterSpecialRequestFormService;
  let notificationMock: MockNotificationService;
  let participantsFormatterMock: MockParticipantsFormatterService;

  beforeEach(() => {
    // Inicialización de mocks limpia
    notificationMock = {
      show: jest.fn(),
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn(),
      getDirectorName: jest.fn(),
      getCodirectorName: jest.fn(),
      getAdvisorName: jest.fn(),
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule], // Necesario para FormBuilder
      providers: [
        RegisterSpecialRequestFormService,
        { provide: NotificationService, useValue: notificationMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(RegisterSpecialRequestFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Configuración del Formulario', () => {
    it('debería exponer las opciones de solicitudes basadas en el enum', () => {
      expect(service.requestOptions).toEqual(Object.values(SpecialRequestType));
      expect(service.requestOptions.length).toBeGreaterThan(0);
    });

    it('debería inicializar el formulario con campos vacíos e inválidos por defecto', () => {
      const form = service.form;

      expect(form.get('requestType')?.value).toBe('');
      expect(form.get('comments')?.value).toBe('');
      expect(form.invalid).toBe(true);
    });

    it('debería marcar los campos como requeridos', () => {
      const form = service.form;
      form.patchValue({ requestType: '', comments: '' });

      expect(form.get('requestType')?.hasError('required')).toBe(true);
      expect(form.get('comments')?.hasError('required')).toBe(true);
    });

    it('debería ser válido cuando se llenan los datos correctamente', () => {
      const form = service.form;
      // Simulamos la inserción de un valor válido del enum y un comentario
      const validEnumVal = Object.values(SpecialRequestType)[0];

      form.patchValue({
        requestType: validEnumVal,
        comments: 'Justificación válida de prueba'
      });

      expect(form.valid).toBe(true);
    });
  });

  describe('Delegación a ThesisParticipantsFormatterService', () => {
    // Objeto mockeado fuertemente tipado para ThesisWork (solo lo mínimo necesario para que no llore TS)
    const mockThesis = { thesisWorkId: 'TW-001' } as ThesisWork;

    it('debería obtener nombres de estudiantes delegando al servicio formateador', () => {
      participantsFormatterMock.getStudentNames.mockReturnValue('Juan Perez');

      const result = service.getStudentNames(mockThesis);

      expect(result).toBe('Juan Perez');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del director delegando al servicio formateador', () => {
      participantsFormatterMock.getDirectorName.mockReturnValue('Dr. Smith');

      const result = service.getDirectorName(mockThesis);

      expect(result).toBe('Dr. Smith');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del codirector delegando al servicio formateador', () => {
      participantsFormatterMock.getCodirectorName.mockReturnValue('Dr. Doe');

      const result = service.getCodirectorName(mockThesis);

      expect(result).toBe('Dr. Doe');
      // FALTABA ESTA ASERCIÓN EN TU CÓDIGO ORIGINAL
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería obtener el nombre del asesor delegando al servicio formateador', () => {
      participantsFormatterMock.getAdvisorName.mockReturnValue('MSc. Gomez');

      const result = service.getAdvisorName(mockThesis);

      expect(result).toBe('MSc. Gomez');
      // FALTABA ESTA ASERCIÓN EN TU CÓDIGO ORIGINAL
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });

  describe('Notificaciones de la UI', () => {
    it('debería mostrar notificación de error cuando el formulario esté incompleto', () => {
      service.notifyIncompleteForm();

      expect(notificationMock.show).toHaveBeenCalledTimes(1);
      expect(notificationMock.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Por favor, seleccione un tipo de solicitud e incluya la justificación requerida.',
        type: NotificationType.ERROR
      });
    });
  });
});
