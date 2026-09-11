import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal, Component, Input, Output, EventEmitter, forwardRef } from '@angular/core';
import { FormGroup, FormControl, ReactiveFormsModule, NG_VALUE_ACCESSOR, ControlValueAccessor } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { AssignEvaluatorsFormComponent } from './assign-evaluators-form.component';
import { AssignEvaluatorsFormFacadeService } from './services/assign-evaluators-form-facade.service';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { Proposal } from '../../../proposal/interfaces/proposal.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { SelectOption, SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

// Componentes originales a remover
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// --- Mocks de Componentes Hijos (Shallow Testing) ---

@Component({ selector: 'app-button-component', standalone: true, template: '<button (click)="onClick.emit()">{{label}}</button>' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled = false;
  @Input() type = 'button';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '<div>Mock Banner <ng-content></ng-content></div>' })
class MockInfoBannerComponent {
  @Input() title = '';
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  template: '<select><option>Mock Select</option></select>',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => MockSearchableSelectComponent),
    multi: true
  }]
})
class MockSearchableSelectComponent implements ControlValueAccessor {
  @Input() id = '';
  @Input() options: SelectOption[] = [];
  @Input() placeholder = '';
  @Input() hasError = false;
  @Input() isValid = false;

  writeValue(obj: unknown): void {}
  registerOnChange(fn: unknown): void {}
  registerOnTouched(fn: unknown): void {}
}

// --- Factories estrictamente tipadas (Cero 'any' y 'unknown') ---

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Director',
  lastName: 'Prueba',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Título de Prueba',
  description: 'Descripción de Prueba',
  modality: Modality.TI,
  state: stateList.APROBADO,
  authors: [],
  director: createMockUser({ id: 'dir-1' }),
  codirector: createMockUser({ id: 'codir-1' }),
  advisor: createMockUser({ id: 'adv-1' }),
  createdAt: new Date('2024-01-01T00:00:00'),
  documents: [],
  evaluations: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_REVISION,
  createdData: new Date('2024-01-01T00:00:00'),
  proposalData: createMockProposal(),
  documents: [],
  evaluations: [],
  evaluators: [],
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

// --- Tipado estricto para el Facade Mock ---

type MockFormType = FormGroup<{
  evaluator1: FormControl<string | null>;
  evaluator2: FormControl<string | null>;
}>;

interface MockAssignEvaluatorsFormFacadeService {
  preliminaryDraft: WritableSignal<PreliminaryDraft | null>;
  form: MockFormType;
  evaluator1Options: WritableSignal<SelectOption[]>;
  evaluator2Options: WritableSignal<SelectOption[]>;
  getMemberFullName: jest.Mock<string, [User | undefined]>;
  getAuthorsNames: jest.Mock<string, [User[] | undefined]>;
  isFieldInvalid: jest.Mock<boolean, [string]>;
  isFieldValid: jest.Mock<boolean, [string]>;
  validateAndGetPayload: jest.Mock<{ ev1: string, ev2: string } | null, []>;
}

describe('AssignEvaluatorsFormComponent', () => {
  let component: AssignEvaluatorsFormComponent;
  let fixture: ComponentFixture<AssignEvaluatorsFormComponent>;
  let mockFacade: MockAssignEvaluatorsFormFacadeService;

  const mockDraft = createMockPreliminaryDraft();

  beforeEach(async () => {
    // 🔕 Silenciar consola para mantener la terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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
      imports: [AssignEvaluatorsFormComponent, ReactiveFormsModule],
      providers: [DatePipe]
    })
    .overrideComponent(AssignEvaluatorsFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent, SearchableSelectComponent],
        providers: [AssignEvaluatorsFormFacadeService]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent, MockSearchableSelectComponent],
        providers: [{ provide: AssignEvaluatorsFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignEvaluatorsFormComponent);
    component = fixture.componentInstance;

    // Proveemos el Input obligatorio
    fixture.componentRef.setInput('preliminaryDraft', mockDraft);
    fixture.detectChanges(); // Dispara el renderizado del HTML y el 'effect'
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola y espías
  });

  it('Debe crear el componente', () => {
    expect(component).toBeTruthy();
  });

  it('Debe sincronizar el Input con el Facade al inicializar mediante el effect', () => {
    expect(mockFacade.preliminaryDraft()).toEqual(mockDraft);
  });

  describe('submit()', () => {
    it('NO debe emitir onSave si el facade retorna null (formulario inválido o error en reglas)', () => {
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
    it('Debe renderizar los errores consultando los validadores del facade', () => {
      // Forzamos un error visual en el evaluador 1 para asegurar que la UI reacciona
      mockFacade.isFieldInvalid.mockImplementation((field) => field === 'evaluator1');
      fixture.detectChanges();

      const compiled = fixture.nativeElement as HTMLElement;
      const errorSpans = compiled.querySelectorAll('.text-textbox-alert');

      expect(mockFacade.isFieldInvalid).toHaveBeenCalledWith('evaluator1');

      // Aseguramos que solo aparece el error de evaluator1 y su texto es correcto
      expect(errorSpans.length).toBe(1);
      expect(errorSpans[0].textContent?.trim()).toBe('Debe seleccionar el primer evaluador');
    });
  });
});
