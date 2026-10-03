import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { UserCreatePageComponent } from './user-create-page.component';
import { UserFormFacadeService } from '../services/user-form-facade.service';
import { User } from '../../interfaces/user.interface';
import { UserState } from '../../enum/user-state.enum';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-user-form', standalone: true, template: '' })
class MockUserFormComponent {
  @Output() onSubmit = new EventEmitter<User>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'aacs',
  idType: IdentificationType.CC,
  idNumber: 12345,
  firstName: 'Test',
  secondName: '',
  lastName: 'User',
  secondLastName: 'Test',
  email: 'test@user.com',
  roles: [UserRoleType.ADMINISTRADOR],
  password: 'password123',
  codeNumber: 101,
  state: UserState.active,
  ...overrides
});

describe('Component: UserCreatePageComponent', () => {
  let component: UserCreatePageComponent;
  let fixture: ComponentFixture<UserCreatePageComponent>;

  let mockFacade: {
    createUser: jest.Mock<void, [User, () => void]>;
  };

  let mockLocation: {
    back: jest.Mock<void, []>;
  };

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockFacade = {
      createUser: jest.fn()
    };

    mockLocation = {
      back: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UserCreatePageComponent],
      providers: [
        { provide: UserFormFacadeService, useValue: mockFacade },
        { provide: Location, useValue: mockLocation }
      ]
    })
    .overrideComponent(UserCreatePageComponent, {
      remove: {
        imports: [UserFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockUserFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserCreatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Flujo de Interacción con el Modal', () => {
    it('debería preparar los datos y abrir el modal al llamar a handleCreateUser', () => {
      const mockUser = createMockUser();
      component.handleCreateUser(mockUser);
      expect(component.pendingUserData).toEqual(mockUser);
      expect(component.isConfirmModalOpen).toBe(true);
    });

    it('debería limpiar los datos y cerrar el modal al cancelar', () => {
      component.pendingUserData = createMockUser();
      component.isConfirmModalOpen = true;
      component.cancelCreation();
      expect(component.isConfirmModalOpen).toBe(false);
      expect(component.pendingUserData).toBeNull();
    });
  });

  describe('Flujo de Confirmación de Creación', () => {
    it('no debería hacer nada en confirmCreation si no hay datos pendientes', () => {
      component.pendingUserData = null;
      component.confirmCreation();
      expect(mockFacade.createUser).not.toHaveBeenCalled();
    });

    it('debería cerrar el modal, delegar al facade y limpiar datos mediante el callback', () => {
      const mockUser = createMockUser();
      component.pendingUserData = mockUser;
      component.isConfirmModalOpen = true;

      mockFacade.createUser.mockImplementation((user, onSuccess) => {
        onSuccess();
      });
      component.confirmCreation();
      expect(component.isConfirmModalOpen).toBe(false);
      expect(mockFacade.createUser).toHaveBeenCalledWith(mockUser, expect.any(Function));
      expect(component.pendingUserData).toBeNull();
    });
  });

  describe('Navegación e Interacción de UI', () => {
    it('debería llamar a location.back() al ejecutar goBack() directamente', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });

    it('debería llamar a location.back() al hacer clic en el botón de regresar del HTML', () => {
      const backButton = fixture.debugElement.query(By.css('button'));
      backButton.triggerEventHandler('click', null);
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
