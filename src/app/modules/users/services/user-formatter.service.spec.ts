import { TestBed } from '@angular/core/testing';
import { UserFormatterService } from './user-formatter.service';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '11111111-1111-1111-1111-111111111111',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: 'Carlos',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  email: 'juan@test.com',
  password: '123',
  codeNumber: 1,
  state: UserState.active,
  roles: [UserRoleType.DOCENTE],
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('UserFormatterService', () => {
  let service: UserFormatterService;

  // Tipado estricto del Mock del Storage (Zero 'any', Zero 'Partial')
  let mockStorageService: {
    getUsersSnapshot: jest.Mock<User[], []>;
  };

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Simulamos la obtención síncrona del snapshot de usuarios devolviendo nuestro usuario base
    mockStorageService = {
      getUsersSnapshot: jest.fn().mockReturnValue([createMockUser()])
    };

    TestBed.configureTestingModule({
      providers: [
        UserFormatterService,
        { provide: UserStorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(UserFormatterService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar espías de consola
  });

  it('debería instanciarse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('formatFullName()', () => {
    it('debería formatear correctamente un usuario con todos los nombres', () => {
      const mockUser = createMockUser();
      const result = service.formatFullName(mockUser);
      expect(result).toBe('Juan Carlos Pérez Gómez');
    });

    it('debería formatear sin dejar dobles espacios si faltan segundos nombres/apellidos', () => {
      // Usamos la fábrica sobreescribiendo los segundos nombres con string vacío
      const userSinSegundos = createMockUser({
        secondName: '',
        secondLastName: ''
      });
      const result = service.formatFullName(userSinSegundos);

      // FIX: Ahora sí esperamos "Juan Pérez", ya que anulamos el secondLastName
      expect(result).toBe('Juan Pérez');
    });
  });

  describe('getUserFullName()', () => {
    it('debería retornar "No asignado" si se pasa undefined o un ID vacío', () => {
      expect(service.getUserFullName(undefined)).toBe('No asignado');
      expect(service.getUserFullName('')).toBe('No asignado');
    });

    it('debería retornar el nombre formateado si el ID existe en el Storage', () => {
      const result = service.getUserFullName('11111111-1111-1111-1111-111111111111');
      expect(result).toBe('Juan Carlos Pérez Gómez');
      expect(mockStorageService.getUsersSnapshot).toHaveBeenCalled();
    });

    it('debería retornar el mismo ID como fallback si el usuario no existe en el Storage', () => {
      const result = service.getUserFullName('id-desconocido-999');
      expect(result).toBe('id-desconocido-999');
    });
  });

  describe('getAuthorsNames()', () => {
    it('debería retornar "Sin autores" si el arreglo es undefined o está vacío', () => {
      expect(service.getAuthorsNames(undefined)).toBe('Sin autores');
      expect(service.getAuthorsNames([])).toBe('Sin autores');
    });

    it('debería procesar y formatear un arreglo mixto de IDs (string) y objetos User', () => {
      // Usuario adicional inyectado directamente como objeto
      const user2 = createMockUser({
        id: '22222222-2222-2222-2222-222222222222',
        firstName: 'Ana',
        secondName: '',
        lastName: 'López',
        secondLastName: ''
      });

      // Arreglo mixto: [Objeto User, String ID (que existe en el mockStorage)]
      const authors = [user2, '11111111-1111-1111-1111-111111111111'];

      const result = service.getAuthorsNames(authors);
      expect(result).toBe('Ana López, Juan Carlos Pérez Gómez');
    });
  });
});
