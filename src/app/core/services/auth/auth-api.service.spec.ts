import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs'; // <-- FIX 1: Importamos 'of' de rxjs

import { AuthApiService } from './auth-api.service';
import { AuthStorageService } from './auth-storage.service';
import { UserService } from '../../../modules/users/services/user.service';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { User } from '../../../modules/users/interfaces/user.interface';
import { ChangePasswordResponse } from '../../interfaces/change-password-response.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown') ──────────────────────────────

interface MockAuthStorageService {
  setUser: jest.Mock<void, [User]>;
  clearUser: jest.Mock<void, []>;
  currentUser: jest.Mock<User | null, []>;
  updateUser: jest.Mock<void, [User]>;
}

interface MockUserService {
  users: WritableSignal<User[]>;
  // <-- FIX 2: Actualizamos el tipo para que refleje que devuelve un Observable (o any para simplificar el mock de void)
  updateUserPasswordMock: jest.Mock<any, [string, string]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => {
  // Definimos un usuario base que cumpla estrictamente con TODOS los
  // campos requeridos por tu interfaz User.
  const baseUser: User = {
    id: '1',
    idType: 'CC',
    idNumber: 1000000000,
    firstName: 'Simón',
    secondName: '',
    lastName: 'Guzmán',
    secondLastName: 'Anaya',
    codeNumber: 1234567890,
    email: 'test@test.com',
    password: '123',
    state: UserState.active,
    roles: [UserRoleType.ESTUDIANTE]
  };

  // Retornamos la fusión. Aquí es el único lugar donde se permite "as User"
  // para calmar al compilador que teme que el Partial inyecte un 'undefined'.
  return { ...baseUser, ...overrides } as User;
};

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('AuthApiService', () => {
  let service: AuthApiService;
  let mockStorageService: MockAuthStorageService;
  let mockUserService: MockUserService;
  let mockRouter: Pick<Router, 'navigate'>;

  const validUser = createMockUser();
  const inactiveUser = createMockUser({
    id: '2',
    email: 'inactive@test.com',
    state: UserState.inactive
  });

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener la terminal limpia ante warnings y errores de RxJS
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockStorageService = {
      setUser: jest.fn(),
      clearUser: jest.fn(),
      currentUser: jest.fn(),
      updateUser: jest.fn()
    };

    mockUserService = {
      users: signal([validUser, inactiveUser]),
      // <-- FIX 3: Instruimos al mock para que devuelva un observable vacío
      updateUserPasswordMock: jest.fn().mockReturnValue(of(undefined))
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

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('login', () => {
    it('debe retornar éxito y guardar usuario si credenciales son correctas', fakeAsync(() => {
      let result: { success: boolean; message?: string } | undefined;

      service.login({ email: 'test@test.com', password: '123' }).subscribe(res => result = res);

      tick(1000); // Avanzamos el delay(1000)

      expect(result?.success).toBeTruthy();
      expect(mockStorageService.setUser).toHaveBeenCalledWith(validUser);
    }));

    it('debe retornar error si las credenciales son incorrectas', fakeAsync(() => {
      let result: { success: boolean; message?: string } | undefined;

      service.login({ email: 'test@test.com', password: 'wrong' }).subscribe(res => result = res);

      tick(1000);

      expect(result?.success).toBeFalsy();
      expect(result?.message).toBe('Correo o contraseña incorrectos.');
      expect(mockStorageService.setUser).not.toHaveBeenCalled();
    }));

    it('debe retornar error si el usuario está inactivo', fakeAsync(() => {
      let result: { success: boolean; message?: string } | undefined;

      service.login({ email: 'inactive@test.com', password: '123' }).subscribe(res => result = res);

      tick(1000);

      expect(result?.success).toBeFalsy();
      expect(result?.message).toContain('inhabilitada');
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
    it('debe lanzar error si la contraseña actual no coincide', (done) => {
      mockStorageService.currentUser.mockReturnValue(validUser);

      // Usamos `done` para asincronismo real, asegurando que el expect se ejecute en el bloque de error
      service.changePassword('wrong', 'newPass').subscribe({
        next: () => done.fail('Debería haber lanzado un error.'),
        error: (err) => {
          expect(err.message).toBe('La contraseña actual es incorrecta.');
          done();
        }
      });
    });

    it('debe lanzar error si currentUser es null', (done) => {
      mockStorageService.currentUser.mockReturnValue(null);

      service.changePassword('123', 'newPass').subscribe({
        next: () => done.fail('Debería haber lanzado un error.'),
        error: (err) => {
          expect(err.message).toBe('La contraseña actual es incorrecta.');
          done();
        }
      });
    });

    it('debe actualizar la contraseña exitosamente', fakeAsync(() => {
      mockStorageService.currentUser.mockReturnValue(validUser);
      let result: ChangePasswordResponse | undefined;

      service.changePassword('123', 'newPass').subscribe(res => result = res);

      tick(1500); // Avanzamos el delay(1500)

      expect(result?.success).toBeTruthy();
      expect(mockStorageService.updateUser).toHaveBeenCalledWith({ ...validUser, password: 'newPass' });
      expect(mockUserService.updateUserPasswordMock).toHaveBeenCalledWith('1', 'newPass');
    }));
  });
});
