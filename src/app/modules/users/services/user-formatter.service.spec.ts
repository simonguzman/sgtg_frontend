import { TestBed } from '@angular/core/testing';
import { UserFormatterService } from './user-formatter.service';
import { UserStorageService } from './user-storage.service';
import { User } from '../interfaces/user.interface';
import { IdentificationType } from '../enum/identification-type.enum';
import { UserState } from '../enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';

describe('UserFormatterService', () => {
  let service: UserFormatterService;
  let mockStorageService: jest.Mocked<Partial<UserStorageService>>;

  // Usuario base estricto para evitar errores de tipado
  const mockUser: User = {
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
    roles: [UserRoleType.DOCENTE]
  };

  beforeEach(() => {
    // Simulamos la obtención síncrona del snapshot de usuarios
    mockStorageService = {
      getUsersSnapshot: jest.fn().mockReturnValue([mockUser])
    };

    TestBed.configureTestingModule({
      providers: [
        UserFormatterService,
        { provide: UserStorageService, useValue: mockStorageService }
      ]
    });

    service = TestBed.inject(UserFormatterService);
  });

  it('debería instanciarse correctamente el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('formatFullName()', () => {
    it('debería formatear correctamente un usuario con todos los nombres', () => {
      const result = service.formatFullName(mockUser);
      expect(result).toBe('Juan Carlos Pérez Gómez');
    });

    it('debería formatear sin dejar dobles espacios si faltan segundos nombres/apellidos', () => {
      const userSinSegundos: User = {
        ...mockUser,
        secondName: '',
        secondLastName: ''
      };
      const result = service.formatFullName(userSinSegundos);
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
      const user2: User = {
        ...mockUser,
        id: '22222222-2222-2222-2222-222222222222',
        firstName: 'Ana',
        secondName: '',
        lastName: 'López',
        secondLastName: ''
      };

      // Arreglo mixto: [Objeto User, String ID (que existe en el mockStorage)]
      const authors = [user2, '11111111-1111-1111-1111-111111111111'];

      const result = service.getAuthorsNames(authors);
      expect(result).toBe('Ana López, Juan Carlos Pérez Gómez');
    });
  });
});
