// 1. Angular Core y Testing
import { TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';

// 2. Servicio a probar
import { EvaluateAdvanceFormService } from './evaluate-advance-form.service';

// 3. Dependencias (Servicios)
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { AdvanceEvaluationResult } from '../../../interfaces/advance-playload.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { UserState } from '../../../../users/enum/user-state.enum';
import { Modality } from '../../../../proposal/enums/modality.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-123',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Estudiante',
  secondName: '',
  lastName: 'Test',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'test@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis = {
    id: '123',
    thesisWorkId: 'mock-id-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
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
        title: 'Mock Title',
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
  return { ...baseThesis, ...overrides } as ThesisWork;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateAdvanceFormService', () => {
  let service: EvaluateAdvanceFormService;
  let formatterSpy: MockFormatterService;

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva, estándar del proyecto
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Inicialización del espía con métodos fuertemente tipados
    formatterSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1')
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        EvaluateAdvanceFormService,
        { provide: ThesisParticipantsFormatterService, useValue: formatterSpy }
      ]
    });

    service = TestBed.inject(EvaluateAdvanceFormService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización del Formulario', () => {
    it('debe inicializar el formulario con los valores por defecto esperados', () => {
      // Act
      const form = service.evaluationForm;

      // Assert
      expect(form).toBeDefined();
      expect(form.getRawValue()).toEqual({
        result: AdvanceEvaluationResult.EN_REVISION,
        comments: ''
      });
    });

    it('el formulario debe ser inválido inicialmente debido al validador "required" en comments', () => {
      // Assert
      expect(service.evaluationForm.valid).toBe(false);
      expect(service.evaluationForm.controls.comments.errors?.['required']).toBeDefined();
    });
  });

  describe('Métodos Proxy de Participantes', () => {
    // Uso de la fábrica en lugar de casteos 'unknown'
    const mockThesis = createMockThesisWork();

    it('debe obtener y retornar los nombres de los estudiantes desde el formatter', () => {
      // Act
      const result = service.getStudentNames(mockThesis);

      // Assert
      expect(result).toBe('Estudiante 1');
      expect(formatterSpy.getStudentNames).toHaveBeenCalledWith(mockThesis);
    });

    it('debe obtener y retornar el nombre del director desde el formatter', () => {
      // Act
      const result = service.getDirectorName(mockThesis);

      // Assert
      expect(result).toBe('Director 1');
      expect(formatterSpy.getDirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe obtener y retornar el nombre del codirector desde el formatter', () => {
      // Act
      const result = service.getCodirectorName(mockThesis);

      // Assert
      expect(result).toBe('Codirector 1');
      expect(formatterSpy.getCodirectorName).toHaveBeenCalledWith(mockThesis);
    });

    it('debe obtener y retornar el nombre del asesor desde el formatter', () => {
      // Act
      const result = service.getAdvisorName(mockThesis);

      // Assert
      expect(result).toBe('Asesor 1');
      expect(formatterSpy.getAdvisorName).toHaveBeenCalledWith(mockThesis);
    });
  });
});
