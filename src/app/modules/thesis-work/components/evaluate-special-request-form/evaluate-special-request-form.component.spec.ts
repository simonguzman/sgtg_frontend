import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';

import { EvaluateSpecialRequestFormComponent } from './evaluate-special-request-form.component';
import { EvaluateSpecialRequestFormService } from './services/evaluate-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';

import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { DatePicker } from 'primeng/datepicker';
import { Modality } from '../../../proposal/enums/modality.enum';

// -----------------------------------------------------------------------------
// MOCKS FUERTEMENTE TIPADOS
// -----------------------------------------------------------------------------

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label: string = '';
  @Input() variant: string = '';
  @Input() disabled: boolean = false;
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title: string = '';
}

@Component({ selector: 'p-datepicker', standalone: true, template: '' })
class MockDatePickerComponent {
  @Input() ngModel: Date | null = null;
  @Input() showIcon: boolean = false;
  @Input() placeholder: string = '';
  @Input() styleClass: string = '';
  @Input() inputStyleClass: string = '';
  @Output() ngModelChange = new EventEmitter<Date | null>();
}

describe('EvaluateSpecialRequestFormComponent', () => {
  let component: EvaluateSpecialRequestFormComponent;
  let fixture: ComponentFixture<EvaluateSpecialRequestFormComponent>;
  let formServiceMock: jest.Mocked<EvaluateSpecialRequestFormService>;

  // Evitamos 'as unknown as' utilizando un casteo parcial seguro para los tests
  const mockThesisWork = {
    state: stateList.EN_REVISION,
    preliminaryDraftData: {
      proposalData: {
        title: 'Título de prueba',
        description: 'Descripción de prueba',
        modality: Modality.TI
      }
    }
  } as ThesisWork;

  const mockSpecialRequest = {
    requestType: SpecialRequestType.CANCELACION,
    description: 'Razón de cancelación'
  } as SpecialRequest;

  beforeEach(async () => {
    formServiceMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue(''),
      notifyMissingVerdict: jest.fn(),
      notifyMissingDeadline: jest.fn()
    } as Partial<EvaluateSpecialRequestFormService> as jest.Mocked<EvaluateSpecialRequestFormService>;

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
    jest.clearAllMocks();
  });

  describe('Inicialización y renderizado', () => {
    it('debería inicializar correctamente y delegar los nombres al servicio', () => {
      expect(component).toBeTruthy();
      expect(component.getStudentNames()).toBe('Estudiante 1');
      expect(formServiceMock.getStudentNames).toHaveBeenCalledWith(mockThesisWork);
    });

    it('getRequestType debería retornar el tipo de la solicitud especial', () => {
      expect(component.getRequestType()).toBe(SpecialRequestType.CANCELACION);
    });
  });

  describe('Interacciones del DOM', () => {
    it('debería actualizar el signal verdictSelected al seleccionar "Cumple con los requisitos"', () => {
      const radioButtons = fixture.debugElement.queryAll(By.css('input[type="radio"][name="verdict"]'));
      const approvedRadio = radioButtons[0].nativeElement as HTMLInputElement;

      approvedRadio.click();
      fixture.detectChanges();

      expect(component.verdictSelected()).toBe(stateList.APROBADO);
    });

    it('debería actualizar el signal verdictSelected al seleccionar "No cumple con los requisitos"', () => {
      const radioButtons = fixture.debugElement.queryAll(By.css('input[type="radio"][name="verdict"]'));
      const rejectedRadio = radioButtons[1].nativeElement as HTMLInputElement;

      rejectedRadio.click();
      fixture.detectChanges();

      expect(component.verdictSelected()).toBe(stateList.NO_APROBADO);
    });

    it('debería mostrar mensaje de error en el DOM si se intenta enviar sin veredicto', () => {
      component.submit();
      fixture.detectChanges();

      const errorMessage = fixture.debugElement.query(By.css('.text-red-500'));
      expect(errorMessage).toBeTruthy();
      expect(errorMessage.nativeElement.textContent).toContain('Debe seleccionar un resultado');
    });
  });

  describe('Lógica reactiva: requiresNewDeadline (Computed)', () => {
    it('debería ser falso si el veredicto no es APROBADO', () => {
      component.verdictSelected.set(stateList.NO_APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.PRORROGA });
      expect(component.requiresNewDeadline()).toBe(false);
    });

    it('debería ser falso si es APROBADO pero el tipo es CANCELACION', () => {
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.CANCELACION });
      expect(component.requiresNewDeadline()).toBe(false);
    });

    it('debería ser verdadero si es APROBADO y el tipo es PRORROGA', () => {
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.PRORROGA });
      expect(component.requiresNewDeadline()).toBe(true);
    });

    it('debería ser verdadero si es APROBADO y el tipo es SUSPENSION', () => {
      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.SUSPENSION });
      expect(component.requiresNewDeadline()).toBe(true);
    });
  });

  describe('Manejo de Formularios y Emisión', () => {
    it('onObservationsChange debería actualizar el signal al recibir evento input', () => {
      const mockEvent = { target: { value: 'Nuevas observaciones' } } as unknown as Event;
      component.onObservationsChange(mockEvent);
      expect(component.observations()).toBe('Nuevas observaciones');
    });

    it('submit debería notificar error y no emitir si no se ha seleccionado un veredicto', () => {
      jest.spyOn(component.onSave, 'emit');
      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingVerdict).toHaveBeenCalled();
      expect(component.onSave.emit).not.toHaveBeenCalled();
    });

    it('submit debería notificar error y no emitir si requiere fecha y no se ha asignado', () => {
      jest.spyOn(component.onSave, 'emit');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.PRORROGA });
      component.grantedDeadline.set(null);

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(formServiceMock.notifyMissingDeadline).toHaveBeenCalled();
      expect(component.onSave.emit).not.toHaveBeenCalled();
    });

    it('submit debería emitir onSave con éxito si no requiere fecha', () => {
      jest.spyOn(component.onSave, 'emit');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.CANCELACION });
      component.observations.set('Todo correcto');

      component.submit();

      expect(component.onSave.emit).toHaveBeenCalledWith({
        status: stateList.APROBADO,
        resolutionDetails: 'Todo correcto',
        grantedDeadline: undefined
      });
    });

    it('submit debería emitir onSave con éxito si requiere fecha y está asignada', () => {
      jest.spyOn(component.onSave, 'emit');
      const mockDate = new Date('2026-12-31');

      component.verdictSelected.set(stateList.APROBADO);
      fixture.componentRef.setInput('specialRequest', { ...mockSpecialRequest, requestType: SpecialRequestType.PRORROGA });
      component.observations.set('Se otorga prórroga');
      component.grantedDeadline.set(mockDate);

      component.submit();

      expect(component.onSave.emit).toHaveBeenCalledWith({
        status: stateList.APROBADO,
        resolutionDetails: 'Se otorga prórroga',
        grantedDeadline: mockDate
      });
    });
  });
});
