import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftService } from '../services/preliminary-draft.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { iniciarSesionConTrabajos } from '../../../testing/sesion-de-prueba';
import {
  crearTrabajoConAnteproyectoRadicado, crearTrabajoEnCurso, crearTrabajoEnEvaluacion
} from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';
const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

const usuario = (id: string, roles: UserRoleType[]): User => ({
  id, idType: IdentificationType.CC, idNumber: 123456789, firstName: 'Nombre', lastName: 'Apellido',
  secondLastName: '', codeNumber: 1234567890, email: 'test@test.com', state: UserState.active, roles
});

/** Versión del anteproyecto en la respuesta del backend. */
const version = (numero: number, estado: 'EN_REVISION' | 'CON_CORRECCIONES' | 'APROBADO' | 'NO_APROBADO') => ({
  tipo: 'ANTEPROYECTO', formato: null, ruta: `15/ANTEPROYECTO/v${numero}/anteproyecto.pdf`, version: numero,
  fechaCarga: '2026-03-09', estado
});

/** El trabajo en evaluación con las versiones indicadas. */
const conVersiones = (base: TrabajoGradoResponse, etapa: TrabajoGradoResponse['etapa'], ...versiones: ReturnType<typeof version>[]) =>
  ({ ...base, etapa, anteproyecto: { ...base.anteproyecto, versiones } }) as TrabajoGradoResponse;

describe('Integración [Anteproyectos]: Ciclo de asignación, evaluación, correcciones y Consejo', () => {
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

  const vigente = () => service.allPreliminaryDrafts()[0];
  const estados = () => vigente().documents.map(documento => documento.status);

  it('asignación, correcciones, nueva versión, aprobación de evaluadores y del Consejo', () => {
    iniciarSesionConTrabajos(usuario('60', [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP]), [crearTrabajoConAnteproyectoRadicado()]);
    expect(estados()).toEqual([stateList.EN_REVISION]);

    // El Jefe asigna los evaluadores
    service.assignReviewers('15', ['20', '21']).subscribe();
    http.expectOne(`${API}/15/anteproyecto/evaluadores`).flush(crearTrabajoEnEvaluacion());
    expect(vigente().evaluators?.map(e => e.id)).toEqual(['20', '21']);

    // Un evaluador pide correcciones: la versión 1 queda con correcciones
    service.registerEvaluatorConcept('15', 'CON_CORRECCIONES', 'Ajustar', pdf('formato-b.pdf')).subscribe();
    http.expectOne(`${API}/15/anteproyecto/conceptos`)
      .flush(conVersiones(crearTrabajoEnEvaluacion(), 'ANTEPROYECTO', version(1, 'CON_CORRECCIONES')));
    expect(estados()).toEqual([stateList.NO_APROBADO]);

    // El director radica la versión 2: vuelve a revisión
    service.uploadCorrection('15', pdf('anteproyecto-v2.pdf')).subscribe();
    http.expectOne(`${API}/15/anteproyecto`)
      .flush(conVersiones(crearTrabajoEnEvaluacion(), 'EVALUACION', version(1, 'CON_CORRECCIONES'), version(2, 'EN_REVISION')));
    expect(estados()).toEqual([stateList.NO_APROBADO, stateList.EN_REVISION]);
    expect(vigente().state).toBe(stateList.EN_REVISION);

    // Ambos aprueban: queda en el Departamento hasta que el Jefe lo remita
    service.registerEvaluatorConcept('15', 'APROBADO', '', pdf('formato-b.pdf')).subscribe();
    http.expectOne(`${API}/15/anteproyecto/conceptos`)
      .flush(conVersiones(crearTrabajoEnEvaluacion(), 'EVALUACION', version(1, 'CON_CORRECCIONES'), version(2, 'APROBADO')));
    expect(vigente().state).toBe(stateList.EVALUADO);

    // El Jefe lo remite al Consejo con el formato C
    service.uploadCouncilPresentation('15', pdf('formato-c.pdf')).subscribe();
    const remitido = conVersiones(crearTrabajoEnEvaluacion(), 'APROBACION_CONSEJO', version(1, 'CON_CORRECCIONES'),
      version(2, 'APROBADO'));
    remitido.anteproyecto.remisiones = [{ tipo: 'REMISION_CONSEJO', formato: 'TI-C', ruta: '15/TI-C/v1/formato-c.pdf',
      version: 2, fechaCarga: '2026-03-12' }];
    http.expectOne(`${API}/15/anteproyecto/remision`).flush(remitido);
    expect(vigente().documents.find(d => d.type === DocumentType.FORMATO_C)?.status).toBe(stateList.EN_REVISION);

    // El Consejo aprueba con la resolución: el trabajo queda en curso
    service.registerCouncilDecision('15', stateList.APROBADO, 'Cumple', pdf('resolucion.pdf')).subscribe();
    http.expectOne(`${API}/15/anteproyecto/decisiones-consejo`).flush(crearTrabajoEnCurso());
    expect(vigente().state).toBe(stateList.APROBADO);
  });

  it('previene conflictos de interés al validar evaluadores', () => {
    const propuesta = {
      director: usuario('1', [UserRoleType.DIRECTOR]),
      authors: [usuario('10', [UserRoleType.ESTUDIANTE])]
    } as Proposal;

    expect(service.validateReviewersRules(propuesta, '1', '21')).toBe('El primer docente tiene vínculos con la propuesta.');
    expect(service.validateReviewersRules(propuesta, '20', '10')).toBe('El segundo docente tiene vínculos con la propuesta.');
    expect(service.validateReviewersRules(propuesta, '20', '20')).toBe('Debe seleccionar dos evaluadores diferentes.');
    expect(service.validateReviewersRules(propuesta, '20', '21')).toBeNull();
  });
});
