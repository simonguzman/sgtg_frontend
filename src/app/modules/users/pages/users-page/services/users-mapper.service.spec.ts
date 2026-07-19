import { TestBed } from '@angular/core/testing';
import { UsersMapperService } from './users-mapper.service';
import { User } from '../../../interfaces/user.interface';
import { IdentificationType } from '../../../enum/identification-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { UserState } from '../../../enum/user-state.enum';

describe('Service: UsersMapperService', () => {
  let service: UsersMapperService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UsersMapperService]
    });
    service = TestBed.inject(UsersMapperService);
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('Método: mapUserToTable', () => {
    const baseUser: User = {
      id: '1',
      idType: IdentificationType.CC,
      idNumber: 123456,
      firstName: 'Juan',
      lastName: 'Pérez',
      secondLastName: 'López',
      email: 'juan@test.com',
      roles: [UserRoleType.DOCENTE],
      password: 'pwd',
      codeNumber: 100,
      state: UserState.active
    };

    it('debería mapear correctamente un usuario ACTIVO', () => {
      const result = service.mapUserToTable(baseUser);

      expect(result.identificacion).toBe('123456');
      expect(result.nombre).toBe('Juan');
      expect(result.apellidos).toBe('Pérez López');
      expect(result.estado).toBe('Activo');
      expect(result.allowedActions).toEqual(['ver roles asignados', 'ver', 'editar', 'eliminar']);
      expect(result.originalData).toEqual(baseUser);
    });

    it('debería mapear correctamente un usuario INACTIVO', () => {
      const inactiveUser = { ...baseUser, state: UserState.inactive };

      const result = service.mapUserToTable(inactiveUser);

      expect(result.estado).toBe('Inactivo');
      expect(result.allowedActions).toEqual(['activar']);
    });

    it('debería manejar correctamente la ausencia de secondLastName', () => {
      const userNoSecondName: User = { ...baseUser, secondLastName: '' };

      const result = service.mapUserToTable(userNoSecondName);

      expect(result.apellidos).toBe('Pérez '); // El mapper concatena con espacio
    });

    it('debería convertir idNumber a string vacío si es null/undefined', () => {
      const userNoId: User = { ...baseUser, idNumber: null as any };

      const result = service.mapUserToTable(userNoId);

      expect(result.identificacion).toBe('');
    });
  });
});
