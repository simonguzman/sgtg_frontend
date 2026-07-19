/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';

import { UserEditPageComponent } from './user-edit-page.component';
import { UserFormFacadeService } from '../services/user-form-facade.service';
import { UserFormComponent } from '../../components/user-form/user-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { User } from '../../interfaces/user.interface';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserState } from '../../enum/user-state.enum';

@Component({ selector: 'app-user-form', standalone: true, template: '<div>Mock Form</div>' })
class MockUserFormComponent {
  @Input() user!: User;
  @Output() onSubmit = new EventEmitter<User>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '<div>Mock Modal</div>' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('Component: UserEditPageComponent', () => {
  let component: UserEditPageComponent;
  let fixture: ComponentFixture<UserEditPageComponent>;

  let mockFacade: {
    getUserById: jest.Mock;
    handleNotFound: jest.Mock;
    updateUser: jest.Mock;
  };
  let mockLocation: {
    back: jest.Mock;
  };
  let mockActivatedRoute: {
    snapshot: {
      paramMap: {
        get: jest.Mock;
      };
    };
  };

  const mockUser: User = {
    id: '123',
    idType: IdentificationType.CC,
    idNumber: 987654,
    firstName: 'Test',
    lastName: 'User',
    secondLastName: 'Perez',
    email: 'test@edit.com',
    roles: [UserRoleType.ADMINISTRADOR],
    password: 'password123',
    codeNumber: 101,
    state: UserState.active
  };

  beforeEach(async () => {
    mockFacade = {
      getUserById: jest.fn().mockReturnValue(of(mockUser)),
      handleNotFound: jest.fn(),
      updateUser: jest.fn()
    };
    mockLocation = { back: jest.fn() };
    mockActivatedRoute = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } }
    };

    await TestBed.configureTestingModule({
      imports: [UserEditPageComponent],
      providers: [
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Location, useValue: mockLocation }
      ]
    })
    .overrideComponent(UserEditPageComponent, {
      remove: {
        imports: [UserFormComponent, ConfirmationActionModalComponent],
        providers: [UserFormFacadeService]
      },
      add: {
        imports: [MockUserFormComponent, MockConfirmationActionModalComponent],
        providers: [{ provide: UserFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UserEditPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y Carga de Datos (ngOnInit)', () => {
    it('debería extraer el ID, consultar al facade y actualizar userToEdit', () => {
      fixture.detectChanges();

      expect(mockActivatedRoute.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(mockFacade.getUserById).toHaveBeenCalledWith('123');
      expect(component.userToEdit()).toEqual(mockUser);
    });

    it('debería invocar handleNotFound si no hay ID en la ruta', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();

      expect(mockFacade.handleNotFound).toHaveBeenCalledWith();
      expect(mockFacade.getUserById).not.toHaveBeenCalled();
    });

    it('debería invocar handleNotFound si el servicio retorna undefined/null', () => {
      mockFacade.getUserById.mockReturnValue(of(null));
      fixture.detectChanges();

      expect(mockFacade.handleNotFound).toHaveBeenCalledWith();
    });

    it('debería invocar handleNotFound si el servicio emite un error', () => {
      mockFacade.getUserById.mockReturnValue(throwError(() => new Error('Network error')));
      fixture.detectChanges();

      expect(mockFacade.handleNotFound).toHaveBeenCalledWith('Error al conectar con el servidor');
    });
  });

  describe('Flujo de Edición y Modal', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería interceptar la actualización (handleUpdate) y abrir el modal', () => {
      const updatedUser = { ...mockUser, firstName: 'Cambiado' };

      component.handleUpdate(updatedUser);

      expect(component.isConfirmModalOpen).toBe(true);
    });

    it('debería cancelar la actualización cerrando el modal', () => {
      component.isConfirmModalOpen = true;

      component.cancelUpdate();

      expect(component.isConfirmModalOpen).toBe(false);
      component.confirmUpdate();
      expect(mockFacade.updateUser).not.toHaveBeenCalled();
    });

    it('no debería llamar al facade en confirmUpdate si no hay datos pendientes (bloqueo preventivo)', () => {
      component.confirmUpdate();
      expect(mockFacade.updateUser).not.toHaveBeenCalled();
    });

    it('debería llamar a facade.updateUser al confirmar y proveer los callbacks correctos', () => {
      const updatedUser = { ...mockUser, firstName: 'Cambiado' };

      component.handleUpdate(updatedUser);
      component.confirmUpdate();

      expect(component.isConfirmModalOpen).toBe(false);
      expect(mockFacade.updateUser).toHaveBeenCalledWith('123', updatedUser, expect.any(Function), expect.any(Function));
    });
  });

  describe('Renderizado de la Vista (HTML)', () => {
    it('debería mostrar el spinner de carga si userToEdit es nulo', () => {
      mockActivatedRoute.snapshot.paramMap.get.mockReturnValue(null);
      fixture.detectChanges();

      const loadingState = fixture.debugElement.query(By.css('.animate-spin'));
      const mockForm = fixture.debugElement.query(By.directive(MockUserFormComponent));

      expect(loadingState).toBeTruthy();
      expect(mockForm).toBeFalsy();
    });

    it('debería renderizar el formulario al completar la carga de datos', () => {
      fixture.detectChanges();
      const loadingState = fixture.debugElement.query(By.css('.animate-spin'));
      const mockForm = fixture.debugElement.query(By.directive(MockUserFormComponent));

      expect(loadingState).toBeFalsy();
      expect(mockForm).toBeTruthy();
    });
  });

  describe('Navegación', () => {
    it('debería llamar a location.back() al ejecutar goBack()', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
