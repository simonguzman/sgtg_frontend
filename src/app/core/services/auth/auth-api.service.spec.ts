import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthApiService } from './auth-api.service';
import { AuthStorageService } from './auth-storage.service';
import { UserService } from '../../../modules/users/services/user.service';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { User } from '../../../modules/users/interfaces/user.interface';
import { signal } from '@angular/core';

describe('AuthApiService', () => {
  let service: AuthApiService;
  let mockStorageService: { setUser: jest.Mock; clearUser: jest.Mock; currentUser: jest.Mock; updateUser: jest.Mock };
  let mockUserService: { users: ReturnType<typeof signal>; updateUserPasswordMock: jest.Mock };
  let mockRouter: { navigate: jest.Mock };

  const validUser = { id: '1', email: 'test@test.com', password: '123', state: UserState.active } as User;
  const inactiveUser = { id: '2', email: 'inactive@test.com', password: '123', state: UserState.inactive } as User;

  beforeEach(() => {
    mockStorageService = {
      setUser: jest.fn(),
      clearUser: jest.fn(),
      currentUser: jest.fn(),
      updateUser: jest.fn()
    };

    mockUserService = {
      users: signal([validUser, inactiveUser]),
      updateUserPasswordMock: jest.fn()
    };

    mockRouter = { navigate: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        AuthApiService,
        { provide: AuthStorageService, useValue: mockStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: Router, useValue: mockRouter }
      ]
    });

    service = TestBed.inject(AuthApiService);
  });

  describe('login', () => {
    it('debe retornar éxito y guardar usuario si credenciales son correctas', fakeAsync(() => {
      let result: any;
      service.login({ email: 'test@test.com', password: '123' }).subscribe(res => result = res);

      tick(1000); // Avanzamos el delay(1000)

      expect(result.success).toBeTruthy();
      expect(mockStorageService.setUser).toHaveBeenCalledWith(validUser);
    }));

    it('debe retornar error si las credenciales son incorrectas', fakeAsync(() => {
      let result: any;
      service.login({ email: 'test@test.com', password: 'wrong' }).subscribe(res => result = res);

      tick(1000);

      expect(result.success).toBeFalsy();
      expect(result.message).toBe('Correo o contraseña incorrectos.');
      expect(mockStorageService.setUser).not.toHaveBeenCalled();
    }));

    it('debe retornar error si el usuario está inactivo', fakeAsync(() => {
      let result: any;
      service.login({ email: 'inactive@test.com', password: '123' }).subscribe(res => result = res);

      tick(1000);

      expect(result.success).toBeFalsy();
      expect(result.message).toContain('inhabilitada');
    }));
  });

  describe('logout', () => {
    it('debe limpiar el usuario y navegar al login', () => {
      service.logout();
      expect(mockStorageService.clearUser).toHaveBeenCalled();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/auth/login']);
    });
  });

  describe('changePassword', () => {
    it('debe lanzar error si la contraseña actual no coincide', () => {
      mockStorageService.currentUser.mockReturnValue(validUser);

      service.changePassword('wrong', 'newPass').subscribe({
        error: (err) => expect(err.message).toBe('La contraseña actual es incorrecta.')
      });
    });

    it('debe actualizar la contraseña exitosamente', fakeAsync(() => {
      mockStorageService.currentUser.mockReturnValue(validUser);
      let result: any;

      service.changePassword('123', 'newPass').subscribe(res => result = res);

      tick(1500); // Avanzamos el delay(1500)

      expect(result.success).toBeTruthy();
      expect(mockStorageService.updateUser).toHaveBeenCalledWith({ ...validUser, password: 'newPass' });
      expect(mockUserService.updateUserPasswordMock).toHaveBeenCalledWith('1', 'newPass');
    }));
  });
});
