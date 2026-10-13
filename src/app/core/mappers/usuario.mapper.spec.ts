import { aClaveDeRol, contractTypeForRoles, mapUserToUsuarioRequest, mapUsuarioToUser, requiresDepartment, requiresProgram } from './usuario.mapper';
import { UsuarioResponse } from '../interfaces/api/auth-api.interface';
import { UserRoleType } from '../enums/user-role-type.enum';
import { IdentificationType } from '../../modules/users/enum/identification-type.enum';
import { UserState } from '../../modules/users/enum/user-state.enum';
import { ContractType } from '../../modules/users/enum/contract-type.enum';
import { User } from '../../modules/users/interfaces/user.interface';

const usuarioApi: UsuarioResponse = {
  id: 15,
  codigo: '104618021',
  tipoDocumento: 'CE',
  numeroDocumento: '1061000000',
  email: 'ana@unicauca.edu.co',
  primerNombre: 'Ana',
  segundoNombre: null,
  primerApellido: 'Pérez',
  segundoApellido: 'Gómez',
  roles: ['DOCENTE', 'JEFE_DEP', 'COMITE', 'CONSEJO'],
  activo: true,
  tipoVinculacion: 'PLANTA',
  departamento: { id: 3, nombre: 'Sistemas' },
  programa: null
};

const user = (overrides: Partial<User> = {}): User => ({
  id: '15',
  idType: IdentificationType.CC,
  idNumber: 1061000000,
  firstName: 'Ana',
  secondName: '',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  codeNumber: 104618021,
  roles: [UserRoleType.DOCENTE],
  email: 'ana@unicauca.edu.co',
  password: 'Clave1234',
  state: UserState.active,
  department: { id: 3, name: 'Sistemas' },
  program: { id: 7, name: 'Ingeniería de Sistemas' },
  ...overrides
});

describe('mapUsuarioToUser', () => {
  it('convierte el usuario del backend al modelo User, con su perfil', () => {
    expect(mapUsuarioToUser(usuarioApi)).toEqual({
      id: '15',
      idType: IdentificationType.CE,
      idNumber: 1061000000,
      firstName: 'Ana',
      secondName: '',
      lastName: 'Pérez',
      secondLastName: 'Gómez',
      codeNumber: 104618021,
      roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP, UserRoleType.COMITE, UserRoleType.CONSEJO],
      email: 'ana@unicauca.edu.co',
      state: UserState.active,
      contractType: ContractType.PLANTA,
      department: { id: 3, name: 'Sistemas' },
      program: null
    });
  });

  it('traduce el estado inactivo y el perfil de estudiante', () => {
    const estudiante = mapUsuarioToUser({
      ...usuarioApi, activo: false, tipoVinculacion: null, departamento: null,
      programa: { id: 7, nombre: 'Ingeniería de Sistemas' }
    });
    expect(estudiante.state).toBe(UserState.inactive);
    expect(estudiante.contractType).toBeNull();
    expect(estudiante.program).toEqual({ id: 7, name: 'Ingeniería de Sistemas' });
  });

  it('descarta los roles que el front no conoce y nunca incluye la contraseña', () => {
    const mapped = mapUsuarioToUser({ ...usuarioApi, roles: ['ADMINISTRADOR', 'ROL_NUEVO'] });
    expect(mapped.roles).toEqual([UserRoleType.ADMINISTRADOR]);
    expect(mapped).not.toHaveProperty('password');
  });

  it('un código no numérico (administrador inicial) queda en 0 en lugar de NaN', () => {
    expect(mapUsuarioToUser({ ...usuarioApi, codigo: 'ADMIN' }).codeNumber).toBe(0);
  });
});

describe('vinculación según los roles', () => {
  it('con rol CODIRECTOR (solo o con DIRECTOR) es de planta', () => {
    expect(contractTypeForRoles([UserRoleType.DOCENTE, UserRoleType.CODIRECTOR])).toBe(ContractType.PLANTA);
    expect(contractTypeForRoles([UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR])).toBe(ContractType.PLANTA);
  });

  it('con rol DIRECTOR sin CODIRECTOR es ocasional (requiere codirector)', () => {
    expect(contractTypeForRoles([UserRoleType.DOCENTE, UserRoleType.DIRECTOR])).toBe(ContractType.OCASIONAL);
  });

  it('con rol JEFE_DEP es de planta y exige el departamento', () => {
    expect(contractTypeForRoles([UserRoleType.DOCENTE, UserRoleType.JEFE_DEP])).toBe(ContractType.PLANTA);
    expect(contractTypeForRoles([UserRoleType.JEFE_DEP, UserRoleType.DIRECTOR])).toBe(ContractType.PLANTA);
    expect(requiresDepartment([UserRoleType.JEFE_DEP])).toBe(true);
  });

  it('con otros roles no hay perfil docente', () => {
    expect(contractTypeForRoles([UserRoleType.DOCENTE, UserRoleType.EVALUADOR])).toBeNull();
    expect(requiresDepartment([UserRoleType.DOCENTE])).toBe(false);
    expect(requiresDepartment([UserRoleType.DIRECTOR])).toBe(true);
  });

  it('el programa solo se exige a los estudiantes', () => {
    expect(requiresProgram([UserRoleType.ESTUDIANTE])).toBe(true);
    expect(requiresProgram([UserRoleType.DOCENTE])).toBe(false);
  });
});

describe('mapUserToUsuarioRequest', () => {
  it('envía claves del backend, texto en código y documento, y null en lo opcional vacío', () => {
    expect(mapUserToUsuarioRequest(user({ roles: [UserRoleType.DOCENTE, UserRoleType.EVALUADOR] }))).toEqual({
      codigo: '104618021',
      tipoDocumento: 'CC',
      numeroDocumento: '1061000000',
      email: 'ana@unicauca.edu.co',
      password: 'Clave1234',
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Pérez',
      segundoApellido: 'Gómez',
      roles: ['DOCENTE', 'EVALUADOR'],
      tipoVinculacion: null,
      departamentoId: null,
      programaId: null
    });
  });

  it('un director lleva vinculación ocasional y su departamento', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.DOCENTE, UserRoleType.DIRECTOR] }));
    expect(request.tipoVinculacion).toBe('OCASIONAL');
    expect(request.departamentoId).toBe(3);
  });

  it('un jefe de departamento lleva vinculación de planta y su departamento', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] }));
    expect(request.tipoVinculacion).toBe('PLANTA');
    expect(request.departamentoId).toBe(3);
  });

  it('un director que también es codirector es de planta', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR] }));
    expect(request.tipoVinculacion).toBe('PLANTA');
  });

  it('un estudiante lleva su programa', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.ESTUDIANTE] }));
    expect(request.programaId).toBe(7);
    expect(request.departamentoId).toBeNull();
  });

  it('acepta el tipo de documento como clave o como etiqueta', () => {
    expect(mapUserToUsuarioRequest(user({ idType: 'PASAPORTE' })).tipoDocumento).toBe('PASAPORTE');
    expect(mapUserToUsuarioRequest(user({ idType: IdentificationType.PASAPORTE })).tipoDocumento).toBe('PASAPORTE');
  });

  it('aClaveDeRol traduce etiquetas a claves', () => {
    expect(aClaveDeRol(UserRoleType.JEFE_DEP)).toBe('JEFE_DEP');
    expect(aClaveDeRol(UserRoleType.COMITE)).toBe('COMITE');
  });
});
