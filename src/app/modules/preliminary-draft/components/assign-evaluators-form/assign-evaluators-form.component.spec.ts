import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignEvaluatorsFormComponent } from './assign-evaluators-form.component';
import { AssignEvaluatorsFormFacadeService } from './services/assign-evaluators-form-facade.service';
import { signal } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { DatePipe } from '@angular/common';

describe('AssignEvaluatorsFormComponent', () => {
  let component: AssignEvaluatorsFormComponent;
  let fixture: ComponentFixture<AssignEvaluatorsFormComponent>;
  let mockFacade: jest.Mocked<Partial<AssignEvaluatorsFormFacadeService>>;

  const mockDraft = {
    proposalData: { title: 'Test', description: 'Desc' }
  } as unknown as PreliminaryDraft;

  beforeEach(async () => {
    // Simulamos el Facade
    mockFacade = {
      draft: signal<PreliminaryDraft | null>(null),
      form: new FormGroup({
        evaluator1: new FormControl(''),
        evaluator2: new FormControl('')
      }),
      evaluator1Options: signal([]),
      evaluator2Options: signal([]),
      getMemberFullName: jest.fn().mockReturnValue('Nombre Test'),
      getAuthorsNames: jest.fn().mockReturnValue('Autor Test'),
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
        providers: [{ provide: AssignEvaluatorsFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignEvaluatorsFormComponent);
    component = fixture.componentInstance;

    // Proveemos el Input obligatorio (Angular 17+ input.required)
    fixture.componentRef.setInput('preliminaryDraft', mockDraft);
    fixture.detectChanges(); // Dispara el effect y renderiza
  });

  it('debería sincronizar el Input con el Facade al inicializar', () => {
    // El 'effect' debió haber actualizado el signal 'draft' del facade
    expect(mockFacade.draft?.()).toEqual(mockDraft);
  });

  describe('submit', () => {
    it('NO debería emitir onSave si el facade retorna null', () => {
      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(null);
      jest.spyOn(component.onSave, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(component.onSave.emit).not.toHaveBeenCalled();
    });

    it('debería emitir onSave con el payload si el facade lo retorna', () => {
      const mockPayload = { ev1: 'u1', ev2: 'u2' };
      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(mockPayload);
      jest.spyOn(component.onSave, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(component.onSave.emit).toHaveBeenCalledWith(mockPayload);
    });
  });
});
