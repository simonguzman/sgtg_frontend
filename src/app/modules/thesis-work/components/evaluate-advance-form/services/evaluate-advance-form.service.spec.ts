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

describe('EvaluateAdvanceFormService', () => {
  let service: EvaluateAdvanceFormService;
  let formatterSpy: jest.Mocked<ThesisParticipantsFormatterService>;

  beforeEach(() => {
    // Inicialización del espía con métodos fuertemente tipados
    formatterSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1')
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;

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
    // Mock robusto de ThesisWork para las validaciones
    const mockThesis = { thesisWorkId: 'mock-id-123' } as unknown as ThesisWork;

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
