// 1. Angular Core & Testing
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

// 2. Service to Test
import { UploadAdvanceFormService } from './upload-advance-form.service';

// 3. Dependencies & Interfaces
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockNotificationService {
  show: jest.Mock<void, [{ title: string; message: string; type: NotificationType }]>;
}

interface MockFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

/**
 * Fábrica centralizada para crear ThesisWork.
 * Como este objeto es muy profundo, definimos la base y usamos el casteo
 * "as ThesisWork" en el punto de retorno, manteniendo los tests limpios.
 */
const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser: User = {
    id: 'user-1',
    idType: IdentificationType.CC,
    idNumber: 123456789,
    firstName: 'Juan',
    secondName: '',
    lastName: 'Pérez',
    secondLastName: 'Gómez',
    codeNumber: 1234567890,
    email: 'juan@universidad.edu.co',
    password: 'hash',
    state: UserState.active,
    roles: []
  };

  // Armamos la estructura profunda basándonos en tu mock
  const baseThesis = {
    thesisWorkId: 'thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.EN_REVISION,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Proyecto de Grado de Prueba',
        description: 'Descripción de prueba',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.EN_REVISION,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };

  return { ...baseThesis, ...overrides } as ThesisWork;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('UploadAdvanceFormService', () => {
  let service: UploadAdvanceFormService;

  let mockNotificationService: MockNotificationService;
  let mockFormatterService: MockFormatterService;

  // Instanciamos el mock puro usando nuestra fábrica
  const mockThesis = createMockThesisWork();

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización estricta
    mockNotificationService = {
      show: jest.fn()
    };

    mockFormatterService = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante Test'),
      getDirectorName: jest.fn().mockReturnValue('Director Test'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Test'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Test')
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        UploadAdvanceFormService,
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ThesisParticipantsFormatterService, useValue: mockFormatterService }
      ]
    });

    service = TestBed.inject(UploadAdvanceFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Validación del Formulario', () => {
    it('debería crearse e inicializar el formulario como inválido y vacío por defecto', () => {
      expect(service).toBeTruthy();
      expect(service.advanceForm.valid).toBe(false);
      expect(service.advanceForm.get('title')?.value).toBe('');
      expect(service.advanceForm.get('comments')?.value).toBe('');
    });

    it('debería marcar el formulario como válido cuando se llenan los campos requeridos', () => {
      // Act: Simulamos el ingreso de datos
      service.advanceForm.patchValue({
        title: 'Avance de Desarrollo',
        comments: 'Se completó el módulo de autenticación.'
      });

      // Assert: Validamos que los Validators.required funcionen
      expect(service.advanceForm.valid).toBe(true);
    });

    it('debería mantener el formulario inválido si falta un campo (ej. comments)', () => {
      service.advanceForm.patchValue({
        title: 'Avance de Desarrollo',
        comments: '' // Vacio a propósito
      });

      expect(service.advanceForm.valid).toBe(false);
    });
  });

  describe('Delegación a ThesisParticipantsFormatterService', () => {
    it('debería delegar la obtención de nombres de estudiantes', () => {
      expect(service.getStudentNames(mockThesis)).toBe('Estudiante Test');
      expect(mockFormatterService.getStudentNames).toHaveBeenCalledWith(mockThesis);
      expect(mockFormatterService.getStudentNames).toHaveBeenCalledTimes(1);
    });

    it('debería delegar la obtención del nombre del director', () => {
      expect(service.getDirectorName(mockThesis)).toBe('Director Test');
      expect(mockFormatterService.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar la obtención del nombre del codirector', () => {
      expect(service.getCodirectorName(mockThesis)).toBe('Codirector Test');
      expect(mockFormatterService.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debería delegar la obtención del nombre del asesor', () => {
      expect(service.getAdvisorName(mockThesis)).toBe('Asesor Test');
      expect(mockFormatterService.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });

  describe('Notificaciones del Sistema', () => {
    it('debería emitir notificación de formulario incompleto con el formato correcto', () => {
      service.notifyIncompleteForm();

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Formulario incompleto',
        message: 'Por favor, complete el título y los comentarios del avance.',
        type: NotificationType.ERROR
      });
      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
    });

    it('debería emitir notificación de archivos faltantes con el formato correcto', () => {
      service.notifyMissingFiles();

      expect(mockNotificationService.show).toHaveBeenCalledWith({
        title: 'Archivos requeridos',
        message: 'Debe adjuntar al menos un archivo como evidencia de su avance.',
        type: NotificationType.ERROR
      });
      expect(mockNotificationService.show).toHaveBeenCalledTimes(1);
    });
  });
});
