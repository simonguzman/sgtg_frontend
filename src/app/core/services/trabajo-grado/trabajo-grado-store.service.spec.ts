import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TrabajoGradoStoreService } from './trabajo-grado-store.service';
import { AuthStorageService } from '../auth/auth-storage.service';
import { UserRoleType } from '../../enums/user-role-type.enum';
import { User } from '../../../modules/users/interfaces/user.interface';
import { UserState } from '../../../modules/users/enum/user-state.enum';
import { crearJwtDePrueba } from '../../../testing/jwt-de-prueba';
import { crearTrabajoDePrueba, crearTrabajoEnCurso } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (roles: UserRoleType[]): User => ({
  id: '1', idType: 'CC', idNumber: 1, firstName: 'U', lastName: 'P', secondLastName: '', codeNumber: 1,
  roles, email: 'u@unicauca.edu.co', state: UserState.active
});

describe('TrabajoGradoStoreService', () => {
  let store: TrabajoGradoStoreService;
  let auth: AuthStorageService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    store = TestBed.inject(TrabajoGradoStoreService);
    auth = TestBed.inject(AuthStorageService);
    http = TestBed.inject(HttpTestingController);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    jest.restoreAllMocks();
  });

  const iniciarSesion = (roles: UserRoleType[]) => {
    auth.setSession(crearJwtDePrueba(), usuario(roles));
    TestBed.tick();
  };

  it('sin sesión no consulta nada', () => {
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(false);
  });

  it('un participante carga solo sus trabajos', () => {
    iniciarSesion([UserRoleType.DOCENTE, UserRoleType.DIRECTOR]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    expect(store.trabajos().map(t => t.id)).toEqual([15]);
    expect(store.cargado()).toBe(true);
  });

  it.each([UserRoleType.COMITE, UserRoleType.JEFE_DEP, UserRoleType.CONSEJO, UserRoleType.ADMINISTRADOR])(
    'el rol %s carga todos los trabajos', rol => {
      iniciarSesion([rol]);
      http.expectOne(API).flush([crearTrabajoDePrueba(), crearTrabajoDePrueba({ id: 16 })]);
      expect(store.trabajos()).toHaveLength(2);
    });

  it('al cerrar sesión vacía la lista', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    auth.clearUser();
    TestBed.tick();
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(false);
  });

  it('si la carga falla conserva la lista y marca la carga como terminada', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush(null, { status: 500, statusText: 'Error' });
    expect(store.trabajos()).toEqual([]);
    expect(store.cargado()).toBe(true);
  });

  it('upsert reemplaza el trabajo actualizado o agrega uno nuevo al inicio', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    store.upsert(crearTrabajoEnCurso());
    expect(store.trabajos()).toHaveLength(1);
    expect(store.porId().get('15')?.etapa).toBe('EN_CURSO');

    store.upsert(crearTrabajoDePrueba({ id: 16 }));
    expect(store.trabajos().map(t => t.id)).toEqual([16, 15]);
  });

  it('obtener usa la memoria y, si no está, lo consulta al backend', () => {
    iniciarSesion([UserRoleType.ESTUDIANTE]);
    http.expectOne(`${API}/mis-trabajos`).flush([crearTrabajoDePrueba()]);

    let encontrado: number | undefined;
    store.obtener('15').subscribe(t => encontrado = t?.id);
    expect(encontrado).toBe(15);

    store.obtener('16').subscribe(t => encontrado = t?.id);
    http.expectOne(`${API}/16`).flush(crearTrabajoDePrueba({ id: 16 }));
    expect(encontrado).toBe(16);
    expect(store.porId().has('16')).toBe(true);

    let noExiste: unknown = 'sin respuesta';
    store.obtener('404').subscribe(t => noExiste = t);
    http.expectOne(`${API}/404`).flush(null, { status: 404, statusText: 'Not Found' });
    expect(noExiste).toBeUndefined();
  });
});
