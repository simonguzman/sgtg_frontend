/* tslint:disable:no-unused-variable */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { UserCreatePageComponent } from './user-create-page.component';
import { UserFormFacadeService } from '../services/user-form-facade.service';
import { User } from '../../interfaces/user.interface';
import { UserState } from '../../enum/user-state.enum';
import { IdentificationType } from '../../enum/identification-type.enum';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';

describe('UserCreatePageComponent', () => {
  let component: UserCreatePageComponent;
  let fixture: ComponentFixture<UserCreatePageComponent>;

  let mockFacade: {
    createUser: jest.Mock;
  };

  let mockLocation: {
    back: jest.Mock;
  };

  const mockUser: User = {
    id: 'aacs',
    idType: 'CC' as IdentificationType,
    idNumber: 12345,
    firstName: 'Test',
    lastName: 'User',
    email: 'test@user.com',
    roles: [UserRoleType.ADMINISTRADOR],
    password: 'password123',
    secondLastName: 'Test',
    codeNumber: 101,
    state: UserState.active
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockFacade = {
      createUser: jest.fn()
    };

    mockLocation = {
      back: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ UserCreatePageComponent ],
      providers: [
        { provide: UserFormFacadeService, useValue: mockFacade },
        { provide: Location, useValue: mockLocation }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserCreatePageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Flujo de Interacción con el Modal', () => {
    it('debería preparar los datos y abrir el modal al llamar a handleCreateUser', () => {
      component.handleCreateUser(mockUser);

      expect(component.pendingUserData).toEqual(mockUser);
      expect(component.isConfirmModalOpen).toBe(true);
    });

    it('debería limpiar los datos y cerrar el modal al cancelar', () => {
      component.pendingUserData = mockUser;
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

  describe('Navegación', () => {
    it('debería llamar a location.back() al ejecutar goBack()', () => {
      component.goBack();
      expect(mockLocation.back).toHaveBeenCalled();
    });
  });
});
