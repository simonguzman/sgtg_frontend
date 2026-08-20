import { TestBed } from '@angular/core/testing';
import { EvaluateSpecialRequestFormService } from './evaluate-special-request-form.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';

// --- Interfaces para Mocks Estrictos (Cero ANY y Cero UNKNOWN) ---
interface MockNotificationService {
  show: jest.Mock;
}

interface MockThesisParticipantsFormatterService {
  getStudentNames: jest.Mock;
  getDirectorName: jest.Mock;
  getCodirectorName: jest.Mock;
  getAdvisorName: jest.Mock;
}

describe('EvaluateSpecialRequestFormService', () => {
  let service: EvaluateSpecialRequestFormService;
  let notificationServiceMock: MockNotificationService;
  let participantsFormatterMock: MockThesisParticipantsFormatterService;

  // Mock validado directamente, sin pasar por unknown
  const mockThesisWork = { thesisWorkId: 'thesis-mock-123' } as ThesisWork;

  beforeEach(() => {
    // Inicialización de mocks limpios
    notificationServiceMock = {
      show: jest.fn()
    };

    participantsFormatterMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getDirectorName: jest.fn().mockReturnValue('Director Prueba'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Prueba'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Prueba')
    };

    TestBed.configureTestingModule({
      providers: [
        EvaluateSpecialRequestFormService,
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: participantsFormatterMock }
      ]
    });

    service = TestBed.inject(EvaluateSpecialRequestFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Delegación de participantes', () => {
    it('debería retornar el nombre del estudiante', () => {
      expect(service.getStudentNames(mockThesisWork)).toBe('Estudiante Prueba');
      expect(participantsFormatterMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del director', () => {
      expect(service.getDirectorName(mockThesisWork)).toBe('Director Prueba');
      expect(participantsFormatterMock.getDirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del codirector', () => {
      expect(service.getCodirectorName(mockThesisWork)).toBe('Codirector Prueba');
      expect(participantsFormatterMock.getCodirectorName).toHaveBeenCalledWith(mockThesisWork);
    });

    it('debería retornar el nombre del asesor', () => {
      expect(service.getAdvisorName(mockThesisWork)).toBe('Asesor Prueba');
      expect(participantsFormatterMock.getAdvisorName).toHaveBeenCalledWith(mockThesisWork);
    });
  });

  describe('Notificaciones', () => {
    it('notifyMissingVerdict debería mostrar un error de falta de calificación', () => {
      service.notifyMissingVerdict();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Falta calificación',
        message: 'Debe seleccionar si la solicitud cumple o no con los requisitos.',
        type: NotificationType.ERROR
      });
    });

    it('notifyMissingDeadline debería mostrar un error de fecha requerida', () => {
      service.notifyMissingDeadline();

      expect(notificationServiceMock.show).toHaveBeenCalledWith({
        title: 'Fecha requerida',
        message: 'Debe asignar la nueva fecha límite de entrega para autorizar la solicitud.',
        type: NotificationType.ERROR
      });
    });
  });
});
