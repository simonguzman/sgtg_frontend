// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

// 2. Componente a probar
import { EvaluateSpecialRequestFormComponent } from './evaluate-special-request-form.component';

// 3. Servicios e Interfaces
import { EvaluateSpecialRequestFormService } from './services/evaluate-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importaciones Basekit para override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { DatePicker } from 'primeng/datepicker';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockEvaluateSpecialRequestFormService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
  notifyMissingVerdict: jest.Mock<void, []>;
  notifyMissingDeadline: jest.Mock<void, []>;
}

// ── Mocks de Componentes Standalone (Strict-Init) ─────────────────────────────

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() disabled: boolean | null = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title = '';
}

@Component({ selector: 'p-datepicker', standalone: true, template: '' })
class MockDatePickerComponent {
  @Input() ngModel: Date | null = null;
  @Input() showIcon = false;
  @Input() placeholder = '';
  @Input() styleClass = '';
  @Input() inputStyleClass = '';
  @Output() ngModelChange = new EventEmitter<Date | null>();
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: ThesisWork = {
    thesisWorkId: 'thesis-mock-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_REVISION,
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
        title: 'Título de prueba',
        description: 'Descripción de prueba',
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
  return { ...baseThesis, ...overrides };
};

// ¡Corregido! Implementa estrictamente la interfaz SpecialRequest
const createMockSpecialRequest = (overrides: Partial<SpecialRequest> = {}): SpecialRequest => ({
  id: 'req-1',
  directorId: 'director-123',
  requestType: SpecialRequestType.CANCELACION,
  description: 'Razón de cancelación',
  requestDate: new Date(),
  status: stateList.EN_REVISION,
  ...overrides
});

// Utilidad nativa para simular un evento de input de textarea sin usar 'as unknown as Event'
const createTextareaEvent = (value: string): Event => {
  const textarea = document.createElement('textarea');
  textarea.value = value;
  const event = new Event('input');
  Object.defineProperty(event, 'target', { value: textarea, writable: false });
  return event;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('EvaluateSpecialRequestFormComponent', () => {
  let component: EvaluateSpecialRequestFormComponent;
  let fixture: ComponentFixture<EvaluateSpecialRequestFormComponent>;

  // Interface Mock estricta
  let formServiceMock: MockEvaluateSpecialRequestFormService;

  // Data fabricada (100% real)
  const mockThesisWork = createMockThesisWork();
  const mockSpecialRequest = createMockSpecialRequest();

  beforeEach(async () => {
    // 🔕 Silenciador preventivo de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Mocks definidos estructuralmente (Sin casteos destructivos)
    formServiceMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue(''),
      notifyMissingVerdict: jest.fn(),
      notifyMissingDeadline: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [EvaluateSpecialRequestFormComponent, FormsModule]
    })
    .overrideComponent(EvaluateSpecialRequestFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent, DatePicker],
        providers: [EvaluateSpecialRequestFormService]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent, MockDatePickerComponent],
        providers: [{ provide: EvaluateSpecialRequestFormService, useValue: formServiceMock }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSpecialRequestFormComponent);
    component = fixture.componentInstance;

    // Uso de setInput (Mejor práctica en Angular moderno para @Input)
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('specialRequest', mockSpecialRequest);

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks(); // Evita cruces
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y renderizado', () => {
    it('debería inicializar correctamente y delegar los nombres al servicio', () => {
      // Assert
      expect(component).toBeTruthy();
      expect(component.getStudentNames()).toBe('Estudiante 1');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('getRequestType debería retornar el tipo de la solicitud especial', () => {
      // Assert
      expect(component.getRequestType()).toBe(SpecialRequestType.CANCELACION);
    });
  });

  describe('Interacciones del DOM', () => {
    it('debería actualizar el signal verdictSelected al seleccionar "Cumple con los requisitos"', () => {
      // Arrange
      const radioButtons = fixture.debugElement.queryAll(By.css('input[type="radio"][name="verdict"]'));
      const approvedRadio = radioButtons[0].nativeElement as HTMLInputElement;

      // Act
      approvedRadio.click();
      fixture.detectChanges();

      // Assert
      expect(component.verdictSelected()).toBe(stateList.APROBADO);
    });

    it('debería actualizar el signal verdictSelected al seleccionar "No cumple con los requisitos"', () => {
      // Arrange
      const radioButtons = fixture.debugElement.queryAll(By.css('input[type="radio"][name="verdict"]'));
      const rejectedRadio = radioButtons[1].nativeElement as HTMLInputElement;

      // Act
      rejectedRadio.click();
      fixture.detectChanges();

      // Assert
      expect(component.verdictSelected()).toBe(stateList.NO_APROBADO);
    });

    it('debería mostrar mensaje de error en el DOM si se intenta enviar sin veredicto', () => {
      // Act
      component.submit();
      fixture.detectChanges();

      // Assert
      const errorMessage = fixture.debugElement.query(By.css('.text-red-500'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Debe seleccionar un resultado');
    });
  });

  describe('Lógica reactiva: requiresNewDeadline (Computed)', () => {
    it('debería ser falso si el veredicto no es APROBADO', () => {
      // Act
      component.verdictSelected.set(stateList.NO_APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.PRORROGA }));

      // Assert
      expect(component.requiresNewDeadline()).toBe(false);
    });

    it('debería ser falso si es APROBADO pero el tipo es CANCELACION', () => {
      // Act
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.CANCELACION }));

      // Assert
      expect(component.requiresNewDeadline()).toBe(false);
    });

    it('debería ser verdadero si es APROBADO y el tipo es PRORROGA', () => {
      // Act
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.PRORROGA }));

      // Assert
      expect(component.requiresNewDeadline()).toBe(true);
    });

    it('debería ser verdadero si es APROBADO y el tipo es SUSPENSION', () => {
      // Act
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.SUSPENSION }));

      // Assert
      expect(component.requiresNewDeadline()).toBe(true);
    });
  });

  describe('Manejo de Formularios y Emisión', () => {
    it('onObservationsChange debería actualizar el signal al recibir evento input', () => {
      // Arrange usando la utilidad nativa, sin as unknown as Event
      const mockEvent = createTextareaEvent('Nuevas observaciones');

      // Act
      component.onObservationsChange(mockEvent);

      // Assert
      expect(component.observations()).toBe('Nuevas observaciones');
    });

    it('submit debería notificar error y no emitir si no se ha seleccionado un veredicto', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.onSave, 'emit');

      // Act
      component.submit();

      // Assert
      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingVerdict).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('submit debería notificar error y no emitir si requiere fecha y no se ha asignado', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.onSave, 'emit');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.PRORROGA }));
      component.grantedDeadline.set(null);

      // Act
      component.submit();

      // Assert
      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingDeadline).toHaveBeenCalled();
      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('submit debería emitir onSave con éxito si no requiere fecha', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.onSave, 'emit');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.CANCELACION }));
      component.observations.set('Todo correcto');

      // Act
      component.submit();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith({
        status: stateList.APROBADO,
        resolutionDetails: 'Todo correcto',
        grantedDeadline: undefined
      });
    });

    it('submit debería emitir onSave con éxito si requiere fecha y está asignada', () => {
      // Arrange
      const emitSpy = jest.spyOn(component.onSave, 'emit');
      const mockDate = new Date('2026-12-31');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', createMockSpecialRequest({ requestType: SpecialRequestType.PRORROGA }));
      component.observations.set('Se otorga prórroga');
      component.grantedDeadline.set(mockDate);

      // Act
      component.submit();

      // Assert
      expect(emitSpy).toHaveBeenCalledWith({
        status: stateList.APROBADO,
        resolutionDetails: 'Se otorga prórroga',
        grantedDeadline: mockDate
      });
    });
  });
});
