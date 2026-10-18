import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';
import { UserService } from '../../users/services/user.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { crearTrabajoEnEvaluacion } from '../../../testing/trabajo-grado-de-prueba';

const API = '/api/v1/sgtg/trabajos-grado';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'default-user',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Name',
  secondName: '',
  lastName: 'Lastname',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'user@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-1',
  title: 'Propuesta Base',
  authors: [],
  ...overrides
} as Proposal);

describe('PreliminaryDraftAssignmentService', () => {
  let service: PreliminaryDraftAssignmentService;
  let http: HttpTestingController;
  let userSpy: { users: WritableSignal<User[]>; loadUsers: jest.Mock };

  beforeEach(() => {
    localStorage.clear();
    userSpy = { users: signal([createMockUser({ id: '20' }), createMockUser({ id: '21' })]), loadUsers: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: UserService, useValue: userSpy }
      ]
    });
    service = TestBed.inject(PreliminaryDraftAssignmentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  describe('validateReviewersRules', () => {
    it('debería retornar error si se selecciona el mismo evaluador dos veces', () => {
      const mockProposal = createMockProposal();
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-1');
      expect(result).toBe('Debe seleccionar dos evaluadores diferentes.');
    });

    it('debería retornar error si no se proporciona la propuesta', () => {
      const result = service.validateReviewersRules(null as unknown as Proposal, 'eval-1', 'eval-2');
      expect(result).toBe('No se proporcionaron los datos de la propuesta.');
    });

    it('debería retornar error si el evaluador 1 tiene vínculos (ej: es director)', () => {
      const mockProposal = createMockProposal({ director: createMockUser({ id: 'eval-1' }) });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador 2 tiene vínculos (ej: es autor/estudiante)', () => {
      const mockProposal = createMockProposal({ authors: [createMockUser({ id: 'eval-2' })] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El segundo docente tiene vínculos con la propuesta.');
    });

    it('debería retornar error si el evaluador tiene vínculos y el autor es un string ID', () => {
      const mockProposal = createMockProposal({ authors: ['eval-1'] as unknown as User[] });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBe('El primer docente tiene vínculos con la propuesta.');
    });

    it('debería retornar null si los evaluadores son válidos y distintos', () => {
      const mockProposal = createMockProposal({
        director: createMockUser({ id: 'dir-1' }),
        authors: [createMockUser({ id: 'student-1' })]
      });
      const result = service.validateReviewersRules(mockProposal, 'eval-1', 'eval-2');
      expect(result).toBeNull();
    });
  });

  describe('assignReviewers', () => {
    it('asigna los evaluadores en el backend, actualiza el trabajo, refresca los usuarios y notifica', () => {
      let terminado = false;
      service.assignReviewers('15', ['20', '21']).subscribe(() => terminado = true);

      const req = http.expectOne(`${API}/15/anteproyecto/evaluadores`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ evaluador1Id: 20, evaluador2Id: 21 });
      req.flush(crearTrabajoEnEvaluacion());

      expect(terminado).toBe(true);
      expect(TestBed.inject(TrabajoGradoStoreService).porId().get('15')?.etapa).toBe('EVALUACION');
      // Los evaluadores ganaron el rol EVALUADOR en el backend
      expect(userSpy.loadUsers).toHaveBeenCalled();
    });

    it('si el backend rechaza la asignación no notifica', () => {
      let error: unknown;
      service.assignReviewers('15', ['20', '21']).subscribe({ error: e => error = e });
      http.expectOne(`${API}/15/anteproyecto/evaluadores`)
        .flush({ message: 'Otro departamento' }, { status: 406, statusText: 'Not Acceptable' });

      expect(error).toBeTruthy();
    });
  });
});
