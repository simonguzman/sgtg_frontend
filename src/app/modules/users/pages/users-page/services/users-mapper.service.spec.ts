import { TestBed } from '@angular/core/testing';
import { UsersMapperService } from './users-mapper.service';
import { User } from '../../../interfaces/user.interface';
import { IdentificationType } from '../../../enum/identification-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { UserState } from '../../../enum/user-state.enum';
import { FilterService } from 'primeng/api';
import { USER_FILTER_FIELDS } from '../models/users-page.model';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: '1',
  idType: IdentificationType.CC,
  idNumber: 123456,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'López',
  email: 'juan@test.com',
  roles: [UserRoleType.DOCENTE],
  password: 'pwd',
  codeNumber: 100,
  state: UserState.active,
  ...overrides
} as User);

describe('Service: UsersMapperService', () => {
  let service: UsersMapperService;
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [UsersMapperService]
    });
    service = TestBed.inject(UsersMapperService);
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });
  describe('Búsqueda por rol', () => {
    it('la fila lleva los roles del usuario para la búsqueda', () => {
      const fila = service.mapUserToTable(createMockUser({ roles: [UserRoleType.COMITE, UserRoleType.CONSEJO] }));
      expect(fila.hiddenRoles).toBe('Comité del programa, Consejo de facultad');
    });

    it('la búsqueda de la tabla encuentra por rol sin importar tildes ni mayúsculas', () => {
      const comite = service.mapUserToTable(createMockUser({ id: '1', firstName: 'Ana', roles: [UserRoleType.COMITE] }));
      const jefe = service.mapUserToTable(createMockUser({ id: '2', firstName: 'Beto', roles: [UserRoleType.JEFE_DEP] }));
      const consejo = service.mapUserToTable(createMockUser({ id: '3', firstName: 'Cata', roles: [UserRoleType.CONSEJO] }));
      const filas = [comite, jefe, consejo];
      const buscar = (texto: string) => new FilterService().filter(filas, USER_FILTER_FIELDS, texto, 'contains');

      expect(buscar('comite')).toEqual([comite]);
      expect(buscar('JEFE')).toEqual([jefe]);
      expect(buscar('consejo')).toEqual([consejo]);
      // Sigue buscando por las columnas visibles
      expect(buscar('beto')).toEqual([jefe]);
    });
  });

  describe('Búsqueda por departamento y programa', () => {
    const SISTEMAS = { id: 1, name: 'Departamento de Sistemas' };
    const TELEMATICA = { id: 2, name: 'Departamento de Telemática' };
    const ING_SISTEMAS = { id: 7, name: 'Ingeniería de Sistemas' };
    const TEC_TELEMATICA = { id: 8, name: 'Tecnología en Telemática' };

    it('la fila lleva el departamento del docente y el programa del estudiante para la búsqueda', () => {
      expect(service.mapUserToTable(createMockUser({ department: SISTEMAS })).hiddenProfile)
        .toBe('Departamento de Sistemas');
      expect(service.mapUserToTable(createMockUser({ roles: [UserRoleType.ESTUDIANTE], program: ING_SISTEMAS }))
        .hiddenProfile).toBe('Ingeniería de Sistemas');
      expect(service.mapUserToTable(createMockUser({ roles: [UserRoleType.CONSEJO] })).hiddenProfile).toBe('');
    });

    it('la búsqueda de la tabla encuentra por departamento o programa sin importar tildes ni mayúsculas', () => {
      const docenteSistemas = service.mapUserToTable(createMockUser({ id: '1', department: SISTEMAS }));
      const docenteTelematica = service.mapUserToTable(createMockUser({ id: '2', department: TELEMATICA }));
      const estudianteSistemas = service.mapUserToTable(createMockUser({ id: '3', roles: [UserRoleType.ESTUDIANTE],
        program: ING_SISTEMAS }));
      const estudianteTelematica = service.mapUserToTable(createMockUser({ id: '4', roles: [UserRoleType.ESTUDIANTE],
        program: TEC_TELEMATICA }));
      const filas = [docenteSistemas, docenteTelematica, estudianteSistemas, estudianteTelematica];
      const buscar = (texto: string) => new FilterService().filter(filas, USER_FILTER_FIELDS, texto, 'contains');

      expect(buscar('departamento de telematica')).toEqual([docenteTelematica]);
      expect(buscar('INGENIERÍA DE SISTEMAS')).toEqual([estudianteSistemas]);
      expect(buscar('telemática')).toEqual([docenteTelematica, estudianteTelematica]);
      expect(buscar('sistemas')).toEqual([docenteSistemas, estudianteSistemas]);
    });
  });

  describe('Método: mapUserToTable', () => {
    it('debería mapear correctamente un usuario ACTIVO', () => {
      const baseUser = createMockUser();
      const result = service.mapUserToTable(baseUser);
      expect(result.identificacion).toBe('123456');
      expect(result.nombre).toBe('Juan');
      expect(result.apellidos).toBe('Pérez López');
      expect(result.estado).toBe('Activo');
      expect(result.allowedActions).toEqual(['ver roles asignados', 'ver', 'editar', 'eliminar']);
      expect(result.originalData).toEqual(baseUser);
    });
    it('debería mostrar el segundo nombre junto al primero', () => {
      const result = service.mapUserToTable(createMockUser({ secondName: 'David' }));
      expect(result.nombre).toBe('Juan David');
    });
    it('debería mapear correctamente un usuario INACTIVO', () => {
      const inactiveUser = createMockUser({ state: UserState.inactive });
      const result = service.mapUserToTable(inactiveUser);
      expect(result.estado).toBe('Inactivo');
      expect(result.allowedActions).toEqual(['activar']);
    });
    it('debería manejar correctamente la ausencia de secondLastName', () => {
      const userNoSecondName = createMockUser({ secondLastName: '' });
      const result = service.mapUserToTable(userNoSecondName);
      expect(result.apellidos).toBe('Pérez');
    });
    it('debería convertir idNumber a string vacío si es null/undefined', () => {
      const userNoId = createMockUser({ idNumber: undefined });
      const result = service.mapUserToTable(userNoId);
      expect(result.identificacion).toBe('');
    });
  });
});
