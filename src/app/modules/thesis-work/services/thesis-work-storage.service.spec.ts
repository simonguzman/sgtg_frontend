import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoEnAnteproyecto, crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: 'CC', idNumber: 1, firstName: 'U', lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: 'u@unicauca.edu.co', state: UserState.active
});

/** Trabajo 16 en curso de otro director (usuario 2) */
const ajeno = crearTrabajoEnCurso({
  id: 16,
  director: { ...crearTrabajoEnCurso().director, usuarioId: 2, nombreCompleto: 'Otro Director' }
});

describe('ThesisWorkStorageService', () => {
  let service: ThesisWorkStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ThesisWorkStorageService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('sin sesión no hay trabajos ni carga', () => {
    expect(service.thesisWorks()).toEqual([]);
    expect(service.isHydrated()).toBe(false);
  });

  it('un trabajo de grado existe solo desde que el Consejo aprueba el anteproyecto', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]),
      [crearTrabajoEnAnteproyecto(), crearTrabajoEnCurso({ id: 17 })]);

    expect(service.isHydrated()).toBe(true);
    expect(service.allThesisWorks().map(w => w.thesisWorkId)).toEqual(['17']);
  });

  it('roles privilegiados (Consejo) ven todos los trabajos activos', () => {
    iniciarSesionConTrabajos(usuario('99', [UserRoleType.CONSEJO]), [crearTrabajoEnCurso(), ajeno]);

    expect(service.hasPrivilegedAccess()).toBe(true);
    expect(service.thesisWorks().map(w => w.thesisWorkId).sort()).toEqual(['15', '16']);
  });

  it('los demás solo ven los trabajos en los que participan', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnCurso(), ajeno]);

    expect(service.thesisWorks().map(w => w.thesisWorkId)).toEqual(['15']);
    expect(service.canUserViewThesisWork(service.allThesisWorks().find(w => w.thesisWorkId === '16')!, '1')).toBe(false);
  });

  it('los trabajos cerrados quedan fuera de la lista activa', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]),
      [crearTrabajoEnCurso({ etapa: 'CANCELADO' })]);

    expect(service.allThesisWorks()[0].state).toBe(stateList.CANCELADO);
    expect(service.thesisWorks()).toEqual([]);
  });

  it('getById consulta al backend el trabajo que no está en memoria', async () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), []);

    const promesa = firstValueFrom(service.getById('15'));
    http.expectOne(`${API}/15`).flush(crearTrabajoEnCurso());

    expect((await promesa)?.thesisWorkId).toBe('15');
  });
});
