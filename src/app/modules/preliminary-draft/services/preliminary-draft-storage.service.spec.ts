import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  crearTrabajoConAnteproyectoRadicado, crearTrabajoEnAnteproyecto, crearTrabajoEnEvaluacion
} from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: 'CC', idNumber: 1, firstName: 'U', lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: 'u@unicauca.edu.co', state: UserState.active
});

/** Trabajo 16 de otro director (usuario 2) */
const ajeno = crearTrabajoConAnteproyectoRadicado({
  id: 16,
  director: { ...crearTrabajoConAnteproyectoRadicado().director, usuarioId: 2, nombreCompleto: 'Otro Director' }
});

describe('PreliminaryDraftStorageService', () => {
  let service: PreliminaryDraftStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PreliminaryDraftStorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sin sesión no hay anteproyectos ni carga', () => {
    expect(service.preliminaryDrafts()).toEqual([]);
    expect(service.isHydrated()).toBe(false);
  });

  it('un trabajo tiene anteproyecto solo desde que se radica su primera versión', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]),
      [crearTrabajoEnAnteproyecto(), crearTrabajoConAnteproyectoRadicado({ id: 17 })]);

    expect(service.isHydrated()).toBe(true);
    expect(service.allPreliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['17']);
  });

  it('roles de consulta (Jefe de departamento) ven todos los anteproyectos', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]),
      [crearTrabajoConAnteproyectoRadicado(), ajeno]);

    expect(service.hasPrivilegedAccess()).toBe(true);
    expect(service.preliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['15', '16']);
  });

  it('los demás solo ven los anteproyectos en los que participan (también como evaluadores)', () => {
    iniciarSesionConTrabajos(usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]),
      [crearTrabajoEnEvaluacion(), ajeno]);

    expect(service.preliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['15']);
  });

  it('las operaciones simuladas de otros módulos no modifican los datos del backend', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DIRECTOR]), [crearTrabajoConAnteproyectoRadicado()]);

    service.updateDraft('15', draft => ({ ...draft, isArchived: true }));
    service.addDraft({ preliminaryDraftId: 'x' } as PreliminaryDraft);
    service.removeDraft('15');

    expect(service.allPreliminaryDrafts().map(d => [d.preliminaryDraftId, d.isArchived])).toEqual([['15', false]]);
  });

  it('getById consulta el backend si el trabajo no está en memoria', () => {
    let resultado: PreliminaryDraft | undefined;
    service.getById('15').subscribe(anteproyecto => resultado = anteproyecto);
    http.expectOne(`${API}/15`).flush(crearTrabajoEnEvaluacion());

    expect(resultado?.evaluators?.map(e => e.id)).toEqual(['20', '21']);
  });
});
