import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, convertToParamMap, provideRouter, RouterStateSnapshot, UrlTree } from '@angular/router';
import { ProposalService } from '../../proposal/services/proposal.service';
import { ArchivedWorksService } from '../pages/history-page/services/archived-works.service';
import { archivedWorkGuard } from '../../../core/guards/archived-work.guard';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  cerrarTrabajo, conConceptoDe, crearTrabajoDePrueba, crearTrabajoEnEvaluacion
} from '../../../testing/trabajo-grado-de-prueba';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';

const API = '/api/v1/sgtg/trabajos-grado';

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: Number(id), firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: Number(id), email: `u${id}@unicauca.edu.co`, state: UserState.active, roles
});

describe('Integración [Historial]: anulación y archivo de trabajos de grado', () => {
  let http: HttpTestingController;
  let notification: { show: jest.Mock };

  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    notification = { show: jest.fn() };
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        { provide: NotificationService, useValue: notification }]
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => jest.restoreAllMocks());

  /** Ejecuta el guard del detalle del historial para el trabajo. */
  const entrar = (id: string, path = 'proposal-details/:id'): Promise<boolean | UrlTree> =>
    TestBed.runInInjectionContext(() => archivedWorkGuard(
      { paramMap: convertToParamMap({ id }), routeConfig: { path } } as unknown as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot)) as Promise<boolean | UrlTree>;

  it('el director anula su propuesta: sale de la lista activa y queda en el historial', async () => {
    iniciarSesionConTrabajos(usuario('1', [UserRoleType.DOCENTE, UserRoleType.DIRECTOR]), [crearTrabajoDePrueba()]);
    const propuestas = TestBed.inject(ProposalService);
    const archivo = TestBed.inject(ArchivedWorksService);
    expect(propuestas.proposals().map(p => p.id)).toEqual(['15']);
    expect(archivo.tableData()).toEqual([]);
    expect(await entrar('15')).toBeInstanceOf(UrlTree);

    propuestas.annulProposal('15', 'Cambio de modalidad').subscribe();
    const req = http.expectOne(`${API}/15/anulacion`);
    expect(req.request.body).toEqual({ justificacion: 'Cambio de modalidad' });
    req.flush(cerrarTrabajo(crearTrabajoDePrueba(), 'CANCELADO', 'ANULACION_DIRECTOR', '2026-03-10T09:00:00',
      'Cambio de modalidad'));

    expect(propuestas.proposals()).toEqual([]);
    expect(archivo.tableData()).toEqual([expect.objectContaining({ id: '15', closedAt: 'Propuesta',
      reason: 'Anulado por el director' })]);
    expect(await entrar('15')).toBe(true);
  });

  it('el evaluador no entra al historial del trabajo', async () => {
    const cancelado = cerrarTrabajo(crearTrabajoEnEvaluacion(), 'CANCELADO', 'ANULACION_DIRECTOR');
    iniciarSesionConTrabajos(usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]), [cancelado]);

    expect(TestBed.inject(ArchivedWorksService).tableData()).toEqual([]);
    expect(await entrar('15')).toBeInstanceOf(UrlTree);
    expect(notification.show).toHaveBeenCalledWith(expect.objectContaining({ title: 'Acceso restringido' }));
  });

  it('Decanatura consulta todo el archivo', async () => {
    const cancelado = cerrarTrabajo(crearTrabajoEnEvaluacion(), 'CANCELADO', 'ANULACION_DIRECTOR');
    // Decanatura carga todos los trabajos (`GET /trabajos-grado`)
    iniciarSesionConTrabajos(usuario('80', [UserRoleType.DECANATURA]), [cancelado]);

    expect(TestBed.inject(ArchivedWorksService).tableData().map(f => f['id'])).toEqual(['15']);
    expect(await entrar('15')).toBe(true);
  });
  it('el evaluador solo lista lo que debe evaluar; lo evaluado pasa a su historial', async () => {
    const evaluador = usuario('20', [UserRoleType.DOCENTE, UserRoleType.EVALUADOR]);
    iniciarSesionConTrabajos(evaluador, [crearTrabajoEnEvaluacion({ id: 15 })]);
    const anteproyectos = TestBed.inject(PreliminaryDraftStorageService);
    const historial = TestBed.inject(ArchivedWorksService);
    expect(anteproyectos.preliminaryDrafts().map(a => a.preliminaryDraftId)).toEqual(['15']);
    expect(historial.tableData()).toEqual([]);

    // Emite su concepto: sale de la lista y entra al historial
    TestBed.inject(TrabajoGradoStoreService).upsert(conConceptoDe(crearTrabajoEnEvaluacion({ id: 15 }), 20));
    expect(anteproyectos.preliminaryDrafts()).toEqual([]);
    expect(historial.tableData().map(f => f['id'])).toEqual(['15']);
    // El detalle del anteproyecto sigue disponible; el de la propuesta no
    expect(await entrar('15', 'preliminary-draft-details/:id')).toBe(true);
    expect(await entrar('15', 'proposal-details/:id')).toBeInstanceOf(UrlTree);
    expect(anteproyectos.canUserViewPreliminaryDraft(anteproyectos.allPreliminaryDrafts()[0], '20')).toBe(true);
  });
});
