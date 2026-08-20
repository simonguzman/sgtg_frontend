import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignEvaluatorsFormComponent } from './assign-evaluators-form.component';
import { AssignEvaluatorsFormFacadeService } from './services/assign-evaluators-form-facade.service';
import { signal, WritableSignal } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { DatePipe } from '@angular/common';

describe('AssignEvaluatorsFormComponent', () => {
  let component: AssignEvaluatorsFormComponent;
  let fixture: ComponentFixture<AssignEvaluatorsFormComponent>;

  // Tipado estricto del Mock del Facade (Zero-Any)
  let mockFacade: {
    preliminaryDraft: WritableSignal<PreliminaryDraft | null>;
    form: FormGroup;
    evaluator1Options: ReturnType<typeof signal>;
    evaluator2Options: ReturnType<typeof signal>;
    getMemberFullName: jest.Mock;
    getAuthorsNames: jest.Mock;
    isFieldInvalid: jest.Mock;
    isFieldValid: jest.Mock;
    validateAndGetPayload: jest.Mock;
  };

  // Mock robusto para evitar errores de renderizado en el HTML
  const mockDraft = {
    state: 'PENDIENTE_ASIGNACION',
    createdData: new Date('2024-01-01'),
    proposalData: {
      title: 'Título de Prueba',
      description: 'Descripción de Prueba',
      modality: 'TRABAJO_DE_GRADO',
      authors: [],
      director: { id: 'dir-1' },
      codirector: { id: 'codir-1' },
      advisor: { id: 'adv-1' }
    }
  } as unknown as PreliminaryDraft;

  beforeEach(async () => {
    mockFacade = {
      preliminaryDraft: signal<PreliminaryDraft | null>(null),
      form: new FormGroup({
        evaluator1: new FormControl(''),
        evaluator2: new FormControl('')
      }),
      evaluator1Options: signal([]),
      evaluator2Options: signal([]),
      getMemberFullName: jest.fn().mockReturnValue('Dr. Mock'),
      getAuthorsNames: jest.fn().mockReturnValue('Estudiante Mock'),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      isFieldValid: jest.fn().mockReturnValue(true),
      validateAndGetPayload: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [AssignEvaluatorsFormComponent],
      providers: [DatePipe]
    })
    .overrideComponent(AssignEvaluatorsFormComponent, {
      set: {
        // Inyectamos el mock directamente en los providers del componente standalone
        providers: [{ provide: AssignEvaluatorsFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignEvaluatorsFormComponent);
    component = fixture.componentInstance;

    // Proveemos el Input obligatorio (Angular 17+ input.required)
    fixture.componentRef.setInput('preliminaryDraft', mockDraft);
    fixture.detectChanges(); // Dispara el renderizado del HTML y la ejecución del 'effect'
  });

  it('Debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('Debe sincronizar el Input con el Facade al inicializar mediante el effect', () => {
    expect(mockFacade.preliminaryDraft()).toEqual(mockDraft);
  });

  describe('submit()', () => {
    it('NO debe emitir onSave si el facade retorna null (formulario inválido o sin cambios)', () => {
      mockFacade.validateAndGetPayload.mockReturnValue(null);
      jest.spyOn(component.onSave, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(component.onSave.emit).not.toHaveBeenCalled();
    });

    it('Debe emitir onSave con el payload si el facade valida correctamente los datos', () => {
      const mockPayload = { ev1: 'user-1', ev2: 'user-2' };
      mockFacade.validateAndGetPayload.mockReturnValue(mockPayload);
      jest.spyOn(component.onSave, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(component.onSave.emit).toHaveBeenCalledWith(mockPayload);
    });
  });

  describe('Interacción con la UI (HTML)', () => {
    it('Debe renderizar los evaluadores consultando los validadores del facade', () => {
      // Forzamos un error visual en el evaluador 1 para asegurar que la UI reacciona
      mockFacade.isFieldInvalid.mockImplementation((field) => field === 'evaluator1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorSpans = compiled.querySelectorAll('.text-textbox-alert');

      expect(mockFacade.isFieldInvalid).toHaveBeenCalledWith('evaluator1');
      expect(errorSpans.length).toBe(1); // Solo debería mostrar error para el evaluador1
      expect(errorSpans[0].textContent?.trim()).toBe('Debe seleccionar el primer evaluador');
    });
  });
});
