import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftStorageService } from '../services/preliminary-draft-storage.service';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoConAnteproyectoRadicado, crearTrabajoEnEvaluacion } from '../../../testing/trabajo-grado-de-prueba';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

/** Trabajo 16 de otro director (usuario 2) */
const ajeno = crearTrabajoConAnteproyectoRadicado({
  id: 16,
  director: { ...crearTrabajoConAnteproyectoRadicado().director, usuarioId: 2, nombreCompleto: 'Otro Director' }
});

describe('Integración [Anteproyectos]: Visibilidad por rol — señal preliminaryDrafts() filtrada', () => {
  let storage: PreliminaryDraftStorageService;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    storage = TestBed.inject(PreliminaryDraftStorageService);
  });

  afterEach(() => jest.restoreAllMocks());

  it('un rol de consulta (Comité) ve TODOS los anteproyectos activos, sin importar participación', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE, UserRoleType.COMITE]), [crearTrabajoEnEvaluacion(), ajeno]);
    expect(storage.preliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['15', '16']);
  });

  it('un evaluador solo ve los anteproyectos que le asignaron', () => {
    iniciarSesionConTrabajos(usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]), [crearTrabajoEnEvaluacion(), ajeno]);
    expect(storage.preliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['15']);
  });

  it('los anteproyectos de trabajos cerrados quedan excluidos incluso para un rol de consulta', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.ADMINISTRADOR]),
      [crearTrabajoEnEvaluacion({ etapa: 'CANCELADO', motivoCierre: 'CANCELACION_DIRECTOR' })]);

    expect(storage.preliminaryDrafts()).toEqual([]);
    expect(storage.allPreliminaryDrafts().map(d => d.isArchived)).toEqual([true]);
  });
});
