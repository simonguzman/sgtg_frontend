import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';
import { AuthStorageService } from './auth-storage.service';
import { AuthApiService } from './auth-api.service';
import { User } from '../../../modules/users/interfaces/user.interface';
import { signal } from '@angular/core';
import { UserRoleType } from '../../enums/user-role-type.enum';

describe('AuthService', () => {
  let service: AuthService;
  let mockStorageService: { currentUser: ReturnType<typeof signal>; isAuthenticated: ReturnType<typeof signal>; userRoles: ReturnType<typeof signal> };
  let mockApiService: { login: jest.Mock; logout: jest.Mock; changePassword: jest.Mock };

  const mockUser = {
    id: '1',
    roles: ['admin', 'student'] as unknown as UserRoleType[]
  } as unknown as User;

  beforeEach(() => {
    mockStorageService = {
      currentUser: signal(mockUser),
      isAuthenticated: signal(true),
      userRoles: signal(['admin', 'student'])
    };

    mockApiService = {
      login: jest.fn(),
      logout: jest.fn(),
      changePassword: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: AuthStorageService, useValue: mockStorageService },
        { provide: AuthApiService, useValue: mockApiService }
      ]
    });

    service = TestBed.inject(AuthService);
  });

  describe('Delegación de métodos API', () => {
    it('debe delegar login a AuthApiService', () => {
      const credentials = { email: 'a@a.com', password: '123' };
      service.login(credentials);
      expect(mockApiService.login).toHaveBeenCalledWith(credentials);
    });

    it('debe delegar logout a AuthApiService', () => {
      service.logout();
      expect(mockApiService.logout).toHaveBeenCalled();
    });

    it('debe delegar changePassword a AuthApiService', () => {
      service.changePassword('old', 'new');
      expect(mockApiService.changePassword).toHaveBeenCalledWith('old', 'new');
    });
  });

  describe('hasAnyRole', () => {
    it('debe retornar true si el usuario tiene al menos uno de los roles requeridos', () => {
      expect(service.hasAnyRole(['admin', 'other'])).toBeTruthy();
      expect(service.hasAnyRole(['student'])).toBeTruthy();
    });

    it('debe retornar false si el usuario no tiene ninguno de los roles requeridos', () => {
      expect(service.hasAnyRole(['teacher', 'guest'])).toBeFalsy();
    });

    it('debe retornar false si no hay usuario en sesión', () => {
      mockStorageService.currentUser.set(null); // Simulamos cierre de sesión
      expect(service.hasAnyRole(['admin'])).toBeFalsy();
    });
  });
});
