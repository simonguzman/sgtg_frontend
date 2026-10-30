import { departamentoDelGestor, esAdministrador, puedeAsignarRol } from './user-management.helper';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../interfaces/user.interface';

describe('user-management.helper', () => {
  const SISTEMAS = { id: 1, name: 'Sistemas' };
  const gestor = (roles: UserRoleType[]) => ({ id: '1', roles, department: SISTEMAS } as unknown as User);

  it('el Comité y el jefe se limitan a su departamento; administrador, Consejo y Decanatura, a toda la facultad', () => {
    expect(departamentoDelGestor(gestor([UserRoleType.JEFE_DEP, UserRoleType.DOCENTE]))).toBe(1);
    expect(departamentoDelGestor(gestor([UserRoleType.COMITE]))).toBe(1);
    [UserRoleType.ADMINISTRADOR, UserRoleType.CONSEJO, UserRoleType.DECANATURA]
      .forEach(rol => expect(departamentoDelGestor(gestor([rol]))).toBeNull());
  });

  it('el administrador asigna cualquier rol; los demás gestores solo Estudiante y Docente', () => {
    expect(esAdministrador(gestor([UserRoleType.ADMINISTRADOR]))).toBe(true);
    expect(puedeAsignarRol(gestor([UserRoleType.ADMINISTRADOR]), UserRoleType.COMITE)).toBe(true);

    const jefe = gestor([UserRoleType.JEFE_DEP]);
    expect(puedeAsignarRol(jefe, UserRoleType.ESTUDIANTE)).toBe(true);
    expect(puedeAsignarRol(jefe, UserRoleType.DOCENTE)).toBe(true);
    [UserRoleType.ADMINISTRADOR, UserRoleType.COMITE, UserRoleType.DIRECTOR, UserRoleType.EVALUADOR]
      .forEach(rol => expect(puedeAsignarRol(jefe, rol)).toBe(false));
    expect(puedeAsignarRol(null, UserRoleType.DOCENTE)).toBe(true);
  });
});
