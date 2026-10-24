import { aClaveDeRol, mapUserToUsuarioRequest, mapUsuarioToUser, requiresProgram, requiresTeacherProfile } from './usuario.mapper';
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
      code: '104618021',
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

  it('un código no numérico (administrador inicial) queda en 0 en lugar de NaN y se conserva para mostrarlo', () => {
    const admin = mapUsuarioToUser({ ...usuarioApi, codigo: 'ADMIN' });
    expect(admin.codeNumber).toBe(0);
    expect(admin.code).toBe('ADMIN');
  });
});

describe('perfil docente según los roles', () => {
  it('cualquier rol de perfil docente pide vinculación y departamento', () => {
    for (const rol of [UserRoleType.DOCENTE, UserRoleType.DIRECTOR, UserRoleType.CODIRECTOR, UserRoleType.EVALUADOR,
      UserRoleType.JURADO, UserRoleType.JURADO_COORDINADOR, UserRoleType.JEFE_DEP, UserRoleType.COMITE]) {
      expect(requiresTeacherProfile([rol])).toBe(true);
    }
    expect(requiresTeacherProfile([UserRoleType.ESTUDIANTE, UserRoleType.CONSEJO])).toBe(false);
  });

  it('el programa solo se exige a los estudiantes', () => {
    expect(requiresProgram([UserRoleType.ESTUDIANTE])).toBe(true);
    expect(requiresProgram([UserRoleType.DOCENTE])).toBe(false);
  });
});

describe('mapUserToUsuarioRequest', () => {
  it('envía claves del backend, texto en código y documento, y null en lo opcional vacío', () => {
    expect(mapUserToUsuarioRequest(user({ roles: [UserRoleType.DECANATURA, UserRoleType.CONSEJO] }))).toEqual({
      codigo: '104618021',
      tipoDocumento: 'CC',
      numeroDocumento: '1061000000',
      email: 'ana@unicauca.edu.co',
      password: 'Clave1234',
      primerNombre: 'Ana',
      segundoNombre: null,
      primerApellido: 'Pérez',
      segundoApellido: 'Gómez',
      roles: ['DECANATURA', 'CONSEJO'],
      tipoVinculacion: null,
      departamentoId: null,
      programaId: null
    });
  });

  it('un docente lleva la vinculación elegida y su departamento (sin deducirla de los roles)', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.DOCENTE], contractType: ContractType.CATEDRA }));
    expect(request.tipoVinculacion).toBe('CATEDRA');
    expect(request.departamentoId).toBe(3);

    const codirector = mapUserToUsuarioRequest(user({ roles: [UserRoleType.CODIRECTOR], contractType: ContractType.OCASIONAL }));
    expect(codirector.tipoVinculacion).toBe('OCASIONAL');
  });

  it('sin roles de perfil docente no envía vinculación ni departamento', () => {
    const request = mapUserToUsuarioRequest(user({ roles: [UserRoleType.CONSEJO], contractType: ContractType.PLANTA }));
    expect(request.tipoVinculacion).toBeNull();
    expect(request.departamentoId).toBeNull();
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
