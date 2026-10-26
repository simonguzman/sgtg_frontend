import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ProposalDocumentService } from './proposal-document.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { User } from '../../users/interfaces/user.interface';
import { UserState } from '../../users/enum/user-state.enum';
import { crearTrabajoDePrueba, crearTrabajoEnAnteproyecto } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const miembroComite: User = {
  id: '30', idType: 'CC', idNumber: 1, firstName: 'Carla', lastName: 'Comité', secondLastName: '', codeNumber: 1,
  roles: [UserRoleType.DOCENTE, UserRoleType.COMITE], email: 'carla@unicauca.edu.co', state: UserState.active
};

const pdf = (nombre: string) => new File(['%PDF'], nombre, { type: 'application/pdf' });

/** Lee el JSON de la parte `datos` de un multipart. */
const leerDatos = (body: FormData): Promise<unknown> => new Promise((resolve, reject) => {
  const lector = new FileReader();
  lector.onload = () => resolve(JSON.parse(lector.result as string));
  lector.onerror = reject;
  lector.readAsText(body.get('datos') as Blob);
});

describe('ProposalDocumentService', () => {
  let service: ProposalDocumentService;
  let http: HttpTestingController;
  let store: TrabajoGradoStoreService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: { users: signal([miembroComite]) } }
      ]
    });
    service = TestBed.inject(ProposalDocumentService);
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(TrabajoGradoStoreService);
  });

  afterEach(() => http.verify());

  describe('registerCommitteeDecision', () => {
    it('envía el concepto del Comité con el acta firmada y actualiza el almacén', async () => {
      let resultado: Proposal | undefined;
      service.registerCommitteeDecision('15', stateList.APROBADO, 'Cumple', pdf('acta.pdf'))
        .subscribe(propuesta => resultado = propuesta);

      const req = http.expectOne(`${API}/15/propuesta/decisiones`);
      expect(req.request.method).toBe('POST');
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('acta.pdf');
      expect(await leerDatos(body)).toEqual({ resultado: 'APROBADO', observaciones: 'Cumple' });
      req.flush(crearTrabajoEnAnteproyecto());

      expect(resultado?.state).toBe(stateList.APROBADO);
      expect(store.porId().get('15')?.etapa).toBe('ANTEPROYECTO');
    });

    it('cualquier veredicto distinto de APROBADO se envía como NO_APROBADO', async () => {
      service.registerCommitteeDecision('15', stateList.NO_APROBADO, 'Ajustar objetivos', pdf('acta.pdf')).subscribe();

      const req = http.expectOne(`${API}/15/propuesta/decisiones`);
      expect(await leerDatos(req.request.body as FormData))
        .toEqual({ resultado: 'NO_APROBADO', observaciones: 'Ajustar objetivos' });
      req.flush(crearTrabajoDePrueba());
    });

    it('si el backend falla no emite eventos', () => {
      let error: unknown;
      service.registerCommitteeDecision('15', stateList.APROBADO, '', pdf('acta.pdf'))
        .subscribe({ error: e => error = e });

      http.expectOne(`${API}/15/propuesta/decisiones`)
        .flush({ mensaje: 'No permitido' }, { status: 403, statusText: 'Forbidden' });

      expect(error).toBeTruthy();
    });
  });

  describe('uploadCorrection', () => {
    it('radica la nueva versión del formato A y avisa a participantes y Comité', () => {
      let resultado: Proposal | undefined;
      service.uploadCorrection('15', pdf('formato-a-v2.pdf')).subscribe(propuesta => resultado = propuesta);

      const req = http.expectOne(`${API}/15/propuesta`);
      const body = req.request.body as FormData;
      expect((body.get('archivo') as File).name).toBe('formato-a-v2.pdf');
      expect(body.has('datos')).toBe(false);
      req.flush(crearTrabajoDePrueba());

      expect(resultado?.id).toBe('15');
    });

    it('en práctica profesional radica el formato A con la nueva carta de aceptación en la misma petición', () => {
      let resultado: Proposal | undefined;
      service.uploadCorrection('15', pdf('formato-a-v2.pdf'), pdf('carta-v2.pdf')).subscribe(propuesta => resultado = propuesta);

      const req = http.expectOne(`${API}/15/propuesta`);
      const partes = req.request.body as FormData;
      expect((partes.get('archivo') as File).name).toBe('formato-a-v2.pdf');
      expect((partes.get('cartaAceptacion') as File).name).toBe('carta-v2.pdf');
      req.flush(crearTrabajoDePrueba());
      http.expectNone(`${API}/15/propuesta/carta-aceptacion`);

      expect(resultado?.id).toBe('15');
    });
  });
});
