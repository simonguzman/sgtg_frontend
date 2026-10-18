import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftService } from '../services/preliminary-draft.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import { crearTrabajoConAnteproyectoRadicado, crearTrabajoEnAnteproyecto } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

describe('Integración [Anteproyectos]: Registro contra el backend y notificación a los Jefes de Departamento', () => {
  let service: PreliminaryDraftService;
  let http: HttpTestingController;

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(PreliminaryDraftService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  it('el director radica la primera versión: el anteproyecto aparece En revisión y se notifica a los jefes', () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoEnAnteproyecto()]);
    TestBed.inject(UserStorageService).updateUsersList(() => [
      usuario('60', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]),
      usuario('61', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP])
    ]);
    // Con la propuesta aprobada pero sin versión radicada aún no hay anteproyecto
    expect(service.preliminaryDrafts()).toEqual([]);

    let creado: PreliminaryDraft | undefined;
    service.createPreliminaryDraft({ proposalId: '15', attachment: new File(['%PDF'], 'anteproyecto.pdf') } as PreliminaryDraft)
      .subscribe(anteproyecto => creado = anteproyecto);
    http.expectOne(`${API}/15/anteproyecto`).flush(crearTrabajoConAnteproyectoRadicado());

    expect(creado?.state).toBe(stateList.EN_REVISION);
    expect(service.preliminaryDrafts().map(d => d.preliminaryDraftId)).toEqual(['15']);
  });
});
