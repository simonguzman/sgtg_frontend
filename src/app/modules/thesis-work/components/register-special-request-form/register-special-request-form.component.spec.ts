import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';
import { RegisterSpecialRequestFormComponent } from './register-special-request-form.component';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

interface MockNotificationService {
  show: jest.Mock;
}

interface MockFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Input() type = 'button';
  @Input() disabled: boolean | null = false;
}

@Component({ selector: 'app-info-banner', standalone: true, template: '' })
class MockInfoBannerComponent {
  @Input() title = '';
}

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
    thesisWorkId: 'TW-001',
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
        title: 'Tesis de Prueba',
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

describe('RegisterSpecialRequestFormComponent', () => {
  let component: RegisterSpecialRequestFormComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestFormComponent>;

  let notificationServiceMock: MockNotificationService;
  let formatterMock: MockFormatterService;

  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

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

    fixture.componentRef.setInput('thesisWork', mockThesisWork);
    fixture.componentRef.setInput('isSubmitting', false);

    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
      expect(component.onSaveRequest.emit).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveRequest con los datos correctos si el formulario es válido', () => {
      jest.spyOn(component.onSaveRequest, 'emit');
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
