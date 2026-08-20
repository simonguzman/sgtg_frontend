// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SimpleChange } from '@angular/core';

// 2. Componente a probar
import { EvaluateAdvanceFormComponent } from './evaluate-advance-form.component';

// 3. Servicios (Provistos por el componente)
import { EvaluateAdvanceFormService } from './services/evaluate-advance-form.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Advance } from '../../interfaces/advance.interface';
import { AdvanceEvaluationResult } from '../../interfaces/advance-playload.interface';

describe('EvaluateAdvanceFormComponent', () => {
  let component: EvaluateAdvanceFormComponent;
  let fixture: ComponentFixture<EvaluateAdvanceFormComponent>;
  let formService: EvaluateAdvanceFormService;

  // Data base mínima y estricta (sin 'any') para que el template no falle
  const mockThesisWork = {
    state: 'Desarrollo',
    preliminaryDraftData: {
      proposalData: {
        title: 'Titulo',
        description: 'Desc',
        modality: 'Trabajo de grado'
      }
    }
  } as unknown as ThesisWork;

  const mockAdvanceData = {
    title: 'Avance 1',
    comments: 'Comentario estudiante',
    documents: [
      { id: '1', name: 'doc1.pdf', url: 'url1', type: 'AVANCE', uploadDate: '2024-01-01' }
    ]
  } as unknown as Advance;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EvaluateAdvanceFormComponent] // Componente Standalone
    }).compileComponents();

    fixture = TestBed.createComponent(EvaluateAdvanceFormComponent);
    component = fixture.componentInstance;

    // Arrange: Inyectamos el servicio que se provee a nivel de componente
    formService = fixture.debugElement.injector.get(EvaluateAdvanceFormService);

    // Arrange: Asignación de Inputs requeridos
    component.thesisWork = mockThesisWork;
    component.advanceData = mockAdvanceData;

    // Arrange: Espiamos los event emitters
    jest.spyOn(component.onSaveEvaluation, 'emit');
    jest.spyOn(component.onDownloadAdvance, 'emit');

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Getters y Estado Inicial', () => {
    it('debe calcular isReadOnly correctamente basado en los inputs de evaluación', () => {
      // Assert: Estado por defecto
      expect(component.isReadOnly).toBe(false);

      // Act & Assert: Mutamos alreadyEvaluated
      component.alreadyEvaluated = true;
      expect(component.isReadOnly).toBe(true);

      // Act & Assert: Mutamos isFullyEvaluated
      component.alreadyEvaluated = false;
      component.isFullyEvaluated = true;
      expect(component.isReadOnly).toBe(true);
    });

    it('debe retornar la lista de documentos de avance de forma segura', () => {
      // Act
      const docs = component.advanceDocuments;

      // Assert
      expect(docs.length).toBe(1);
      expect(docs[0].name).toBe('doc1.pdf');
    });

    it('debe retornar una lista vacía si documents no existe o es nulo', () => {
      // Arrange
      component.advanceData = {} as unknown as Advance;

      // Act & Assert
      expect(component.advanceDocuments).toEqual([]);
    });
  });

  describe('Ciclo de vida (ngOnChanges)', () => {
    it('debe deshabilitar el formulario si el estado cambia a read-only (alreadyEvaluated = true)', () => {
      // Arrange
      component.alreadyEvaluated = true;
      const changes = {
        alreadyEvaluated: new SimpleChange(false, true, false)
      };

      // Act
      component.ngOnChanges(changes);

      // Assert
      expect(component.evaluationForm.disabled).toBe(true);
    });

    it('debe habilitar el formulario si el estado cambia a editable', () => {
      // Arrange
      component.alreadyEvaluated = false;
      component.isFullyEvaluated = false;
      component.evaluationForm.disable(); // Forzamos estado deshabilitado inicial

      const changes = {
        isFullyEvaluated: new SimpleChange(true, false, false)
      };

      // Act
      component.ngOnChanges(changes);

      // Assert
      expect(component.evaluationForm.enabled).toBe(true);
    });
  });

  describe('Manejo de Archivos (Retroalimentación vía Signals)', () => {
    it('debe agregar un archivo al Signal al disparar handleFeedbackUploaded y cerrar el modal', () => {
      // Arrange
      const mockFile = new File([''], 'test.pdf');
      const payload = { fileName: 'test.pdf', file: mockFile };
      component.isFeedbackModalOpen.set(true);

      // Act
      component.handleFeedbackUploaded(payload);

      // Assert
      expect(component.uploadedFeedbackFiles()).toEqual([payload]);
      expect(component.isFeedbackModalOpen()).toBe(false);
    });

    it('debe eliminar un archivo del Signal basado en su índice (removeFeedbackFile)', () => {
      // Arrange
      const mockFile = new File([''], 'test.pdf');
      component.uploadedFeedbackFiles.set([
        { fileName: 'f1.pdf', file: mockFile },
        { fileName: 'f2.pdf', file: mockFile }
      ]);

      // Act
      component.removeFeedbackFile(0);

      // Assert
      expect(component.uploadedFeedbackFiles().length).toBe(1);
      expect(component.uploadedFeedbackFiles()[0].fileName).toBe('f2.pdf');
    });
  });

  describe('Validación y Envío (submit)', () => {
    it('debe marcar el formulario como touched y no emitir si el formulario es inválido', () => {
      // Arrange: Por defecto el campo comments está vacío (inválido)

      // Act
      component.submit();

      // Assert
      expect(component.evaluationForm.touched).toBe(true);
      expect(component.isFieldInvalid('comments')).toBe(true);
      expect(component.onSaveEvaluation.emit).not.toHaveBeenCalled();
    });

    it('debe emitir el payload formateado correctamente si el formulario es válido', () => {
      // Arrange
      const mockFile = new File([''], 'retro.pdf');
      component.uploadedFeedbackFiles.set([{ fileName: 'retro.pdf', file: mockFile }]);

      component.evaluationForm.patchValue({
        result: AdvanceEvaluationResult.EVALUADO,
        comments: 'Excelente avance, todo en orden.'
      });

      // Act
      component.submit();

      // Assert
      expect(component.onSaveEvaluation.emit).toHaveBeenCalledWith({
        formValues: {
          result: AdvanceEvaluationResult.EVALUADO,
          comments: 'Excelente avance, todo en orden.'
        },
        files: [mockFile] // Asegura que mapeó correctamente desestructurando el { fileName, file }
      });
    });
  });

  describe('Delegación al FormService (Proxies)', () => {
    it('debe llamar al servicio para obtener los nombres de estudiantes', () => {
      // Arrange
      jest.spyOn(formService, 'getStudentNames').mockReturnValue('Estudiante Prueba');

      // Act
      const result = component.getStudentNames();

      // Assert
      expect(result).toBe('Estudiante Prueba');
      expect(formService.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });
  });
});
