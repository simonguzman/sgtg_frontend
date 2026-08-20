import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterSpecialRequestFormComponent } from './register-special-request-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { Component, Input } from '@angular/core';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { Modality } from '../../../proposal/enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';

// --- Interfaces para Mocks Estrictos (Cero ANY) ---
interface MockNotificationService {
  show: jest.Mock;
}

interface MockFormatterService {
  getStudentNames: jest.Mock;
  getDirectorName: jest.Mock;
  getCodirectorName: jest.Mock;
  getAdvisorName: jest.Mock;
}

// --- Mocks de Componentes Standalone (UI Basekit) con Tipos Definidos ---
@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label!: string;
  @Input() variant!: string;
  @Input() type!: string;
  @Input() disabled!: boolean;
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title!: string;
}

describe('RegisterSpecialRequestFormComponent', () => {
  let component: RegisterSpecialRequestFormComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestFormComponent>;

  let notificationServiceMock: MockNotificationService;
  let formatterMock: MockFormatterService;

  // Mock robusto de ThesisWork con la estructura esperada por el template
  const mockThesisWork = {
    preliminaryDraftData: {
      proposalData: {
        title: 'Tesis de Prueba',
        description: 'Descripción de prueba',
        modality: Modality.TI
      }
    },
    state: stateList.EN_DESARROLLO
  } as ThesisWork;

  beforeEach(async () => {
    notificationServiceMock = {
      show: jest.fn()
    };

    formatterMock = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante 1'),
      getDirectorName: jest.fn().mockReturnValue('Director 1'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector 1'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor 1'),
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSpecialRequestFormComponent],
      providers: [
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: ThesisParticipantsFormatterService, useValue: formatterMock }
      ]
    })
    .overrideComponent(RegisterSpecialRequestFormComponent, {
      remove: {
        imports: [ButtonComponent, InfoBannerComponent]
      },
      add: {
        imports: [MockButtonComponent, MockInfoBannerComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSpecialRequestFormComponent);
    component = fixture.componentInstance;

    // Asignación de Inputs requeridos modernos
    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('isSubmitting', false);

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Renderizado Condicional del Template', () => {
    it('debería mostrar campos opcionales si existen (Codirector y Asesor)', () => {
      const html = fixture.nativeElement.innerHTML;
      expect(html).toContain('Codirector');
      expect(html).toContain('Asesor');
    });

    it('no debería renderizar Codirector ni Asesor si los valores vienen vacíos', () => {
      formatterMock.getCodirectorName.mockReturnValue('');
      formatterMock.getAdvisorName.mockReturnValue('');

      fixture.detectChanges();

      const html = fixture.nativeElement.innerHTML;
      expect(html).not.toContain('Codirector');
      expect(html).not.toContain('Asesor');
    });
  });

  describe('Validación Visual de Campos (isFieldInvalid)', () => {
    it('debería retornar true si el campo es tocado y es inválido', () => {
      const typeControl = component.requestForm.get('requestType');
      typeControl?.markAsTouched();

      expect(component.isFieldInvalid('requestType')).toBe(true);
    });

    it('debería retornar true si se intentó enviar el formulario (submit) aunque el campo no se haya tocado', () => {
      component.isSubmitAttempted.set(true);

      expect(component.isFieldInvalid('comments')).toBe(true);
    });

    it('debería retornar false si el campo está intacto y no ha habido intento de envío', () => {
      expect(component.isFieldInvalid('comments')).toBe(false);
    });
  });

  describe('Flujo de Envío (Submit)', () => {
    it('debería notificar el error y no emitir evento si el formulario es inválido', () => {
      jest.spyOn(component.onSaveRequest, 'emit');

      component.submit();

      expect(component.isSubmitAttempted()).toBe(true);
      expect(component.requestForm.touched).toBe(true);

      // Al ser un test de integración con el servicio proveído, el mock del servicio global se llama a través del formService
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
      expect(component.onSaveRequest.emit).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveRequest con los datos correctos si el formulario es válido', () => {
      jest.spyOn(component.onSaveRequest, 'emit');

      // Obtenemos un valor válido dinámicamente del Enum para que el test no se rompa si el Enum cambia
      const validRequestType = Object.values(SpecialRequestType)[0];

      component.requestForm.patchValue({
        requestType: validRequestType,
        comments: 'Razón válida de prueba para la solicitud especial'
      });

      component.submit();

      expect(notificationServiceMock.show).not.toHaveBeenCalled();
      expect(component.onSaveRequest.emit).toHaveBeenCalledWith({
        requestType: validRequestType,
        comments: 'Razón válida de prueba para la solicitud especial'
      });
    });
  });
});
