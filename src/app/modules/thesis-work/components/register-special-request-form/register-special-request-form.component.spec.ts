// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input } from '@angular/core';

// 2. Componente a probar
import { RegisterSpecialRequestFormComponent } from './register-special-request-form.component';

// 3. Servicios e Interfaces
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { stateList } from '../../../../core/enums/state.enum';

// Importaciones para Override
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────

interface MockNotificationService {
  show: jest.Mock;
}

interface MockFormatterService {
  getStudentNames: jest.Mock<string, [ThesisWork]>;
  getDirectorName: jest.Mock<string, [ThesisWork]>;
  getCodirectorName: jest.Mock<string, [ThesisWork]>;
  getAdvisorName: jest.Mock<string, [ThesisWork]>;
}

// ── Mocks de Componentes Standalone (UI Basekit - Strict Init) ──────────────

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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterSpecialRequestFormComponent', () => {
  let component: RegisterSpecialRequestFormComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestFormComponent>;

  // Interfaces Mocks estrictas
  let notificationServiceMock: MockNotificationService;
  let formatterMock: MockFormatterService;

  // Data pre-fabricada hidratada
  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    // 🔕 Silenciar consola preventivamente para evitar ruido de Angular Forms
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
      // Nota: No removemos los `providers` del decorador del componente
      // porque queremos probar la integración real Componente <-> FormService
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
    jest.clearAllMocks(); // Evita fugas entre tests
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Renderizado Condicional del Template', () => {
    it('debería mostrar campos opcionales si existen (Codirector y Asesor)', () => {
      // Act
      const html = fixture.nativeElement.innerHTML;

      // Assert
      expect(html).toContain('Codirector');
      expect(html).toContain('Asesor');
    });

    it('no debería renderizar Codirector ni Asesor si los valores vienen vacíos', () => {
      // Arrange
      formatterMock.getCodirectorName.mockReturnValue('');
      formatterMock.getAdvisorName.mockReturnValue('');

      // Act
      fixture.detectChanges();

      // Assert
      const html = fixture.nativeElement.innerHTML;
      expect(html).not.toContain('Codirector');
      expect(html).not.toContain('Asesor');
    });
  });

  describe('Validación Visual de Campos (isFieldInvalid)', () => {
    it('debería retornar true si el campo es tocado y es inválido', () => {
      // Arrange
      const typeControl = component.requestForm.get('requestType');

      // Act
      typeControl?.markAsTouched();

      // Assert
      expect(component.isFieldInvalid('requestType')).toBe(true);
    });

    it('debería retornar true si se intentó enviar el formulario (submit) aunque el campo no se haya tocado', () => {
      // Act
      component.isSubmitAttempted.set(true);

      // Assert
      expect(component.isFieldInvalid('comments')).toBe(true);
    });

    it('debería retornar false si el campo está intacto y no ha habido intento de envío', () => {
      // Assert
      expect(component.isFieldInvalid('comments')).toBe(false);
    });
  });

  describe('Flujo de Envío (Submit)', () => {
    it('debería notificar el error y no emitir evento si el formulario es inválido', () => {
      // Arrange
      jest.spyOn(component.onSaveRequest, 'emit');

      // Act
      component.submit();

      // Assert
      expect(component.isSubmitAttempted()).toBe(true);
      expect(component.requestForm.touched).toBe(true);

      // El mock del servicio global se llama a través del formService interno
      expect(notificationServiceMock.show).toHaveBeenCalledTimes(1);
      expect(component.onSaveRequest.emit).not.toHaveBeenCalled();
    });

    it('debería emitir onSaveRequest con los datos correctos si el formulario es válido', () => {
      // Arrange
      jest.spyOn(component.onSaveRequest, 'emit');
      const validRequestType = Object.values(SpecialRequestType)[0]; // Valor real dinámico

      component.requestForm.patchValue({
        requestType: validRequestType,
        comments: 'Razón válida de prueba para la solicitud especial'
      });

      // Act
      component.submit();

      // Assert
      expect(notificationServiceMock.show).not.toHaveBeenCalled();
      expect(component.onSaveRequest.emit).toHaveBeenCalledWith({
        requestType: validRequestType,
        comments: 'Razón válida de prueba para la solicitud especial'
      });
    });
  });
});
