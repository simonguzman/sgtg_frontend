import { canEvaluateWork } from './evaluator-eligibility.helper';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../interfaces/user.interface';

describe('canEvaluateWork', () => {
  const SISTEMAS = { id: 1, name: 'Sistemas' };
  const TELEMATICA = { id: 2, name: 'Telemática' };
  const usuario = (id: string, roles: UserRoleType[], department = SISTEMAS) =>
    ({ id, roles, department } as unknown as User);
  const ninguno = new Set<string>();

  it('acepta docentes, evaluadores y jurados del departamento del director', () => {
    [UserRoleType.DOCENTE, UserRoleType.EVALUADOR, UserRoleType.JURADO, UserRoleType.JURADO_COORDINADOR]
      .forEach(rol => expect(canEvaluateWork(usuario('1', [rol]), SISTEMAS.id, ninguno)).toBe(true));
  });

  it('acepta al jefe de departamento', () => {
    expect(canEvaluateWork(usuario('1', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]), SISTEMAS.id, ninguno)).toBe(true);
  });

  it('rechaza a los miembros del Comité, del Consejo y de Decanatura', () => {
    [UserRoleType.COMITE, UserRoleType.CONSEJO, UserRoleType.DECANATURA].forEach(rol =>
      expect(canEvaluateWork(usuario('1', [UserRoleType.DOCENTE, rol]), SISTEMAS.id, ninguno)).toBe(false));
  });

  it('rechaza docentes de otro departamento, sin rol para evaluar o que ya participan', () => {
    expect(canEvaluateWork(usuario('1', [UserRoleType.DOCENTE], TELEMATICA), SISTEMAS.id, ninguno)).toBe(false);
    expect(canEvaluateWork(usuario('1', [UserRoleType.ASESOR]), SISTEMAS.id, ninguno)).toBe(false);
    expect(canEvaluateWork(usuario('1', [UserRoleType.DOCENTE]), SISTEMAS.id, new Set(['1']))).toBe(false);
    // Sin departamento del director no hay a quién asignar
    expect(canEvaluateWork(usuario('1', [UserRoleType.DOCENTE]), null, ninguno)).toBe(false);
  });
});
