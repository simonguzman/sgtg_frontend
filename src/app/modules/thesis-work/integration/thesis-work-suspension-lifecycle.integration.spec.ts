// src/app/modules/thesis-work/integration/thesis-work-suspension-lifecycle.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, flush } from '@angular/core/testing';
import { Injector, signal, WritableSignal } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';
import { of } from 'rxjs';

import { ThesisWorkPageFacadeService } from '../pages/thesis-work-page/services/thesis-work-page-facade.service';
import { ThesisWorkPageMapperService } from '../pages/thesis-work-page/services/thesis-work-page-mapper.service';
import { ThesisWorkService } from '../services/thesis-work.service';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { ThesisWorkSpecialRequestService } from '../services/thesis-work-special-request.service';
import { ThesisWorkApiService } from '../services/thesis-work-api.service';
import { ThesisWorkAdvanceService } from '../services/thesis-work-advance.service';
import { ThesisWorkDeliveryService } from '../services/thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from '../services/thesis-work-evaluation.service';
import { ThesisWorkSustentationService } from '../services/thesis-work-sustentation.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SpecialRequest } from '../interfaces/special-request.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Nombre',
  lastName: 'Apellido',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'test@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Trabajo de Grado]: Suspensión aprobada → visibilidad del botón "reactivar"', () => {
  const thesisId = 'thesis-susp-1';
  const requestId = 'req-susp-1';
  const directorId = 'dir-1';

  let facade: ThesisWorkPageFacadeService;
  let storage: ThesisWorkStorageService;
  let mockCurrentUser: WritableSignal<Partial<User>>;
  let mockHasAnyRole: jest.Mock;

  beforeAll(() => {
    if (typeof global.structuredClone !== 'function') {
      global.structuredClone = (val) => JSON.parse(JSON.stringify(val));
    }
  });

  beforeEach(async () => {
    mockCurrentUser = signal({ id: 'outsider' });
    mockHasAnyRole = jest.fn().mockReturnValue(false);

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkPageFacadeService, ThesisWorkPageMapperService,
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkSpecialRequestService,
        ThesisWorkApiService, ThesisWorkAdvanceService, ThesisWorkDeliveryService,
        ThesisWorkEvaluationService, ThesisWorkSustentationService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        {
          provide: AuthService,
          useValue: {
            currentUser: mockCurrentUser,
            hasAnyRole: mockHasAnyRole
          }
        },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    facade = TestBed.inject(ThesisWorkPageFacadeService);
    storage = TestBed.inject(ThesisWorkStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(storage.isHydrated, injector);
  });

  function buildThesisWorkWithPendingSuspension(director: User): ThesisWork {
    const proposal: Proposal = {
      id: 'prop-susp-1', title: 'Tesis en suspensión', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-susp-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    const pendingRequest: SpecialRequest = {
      id: requestId, directorId: director.id, requestType: SpecialRequestType.SUSPENSION,
      requestDate: new Date(), description: 'Solicito suspensión por motivos de salud',
      status: stateList.EN_REVISION
    };
    return {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.EN_DESARROLLO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [], pazYSalvos: [], specialRequests: [pendingRequest], isArchived: false
    };
  }

  it('el Consejo SÍ debe ver "reactivar" tras aprobar la suspensión, y el botón "ver" debe ocultarse', fakeAsync(() => {
    const director = createMockUser({ id: directorId, firstName: 'Director' });

    mockCurrentUser.set({ id: 'consejo-1' });
    mockHasAnyRole.mockImplementation((required: UserRoleType[]) => required.includes(UserRoleType.CONSEJO));

    storage['_thesisWorksList'].set([buildThesisWorkWithPendingSuspension(director)]);

    // Simular que la suspensión fue aprobada mutando el storage
    storage.updateWork(thesisId, w => ({
      ...w,
      state: stateList.SUSPENDIDO,
      specialRequests: w.specialRequests?.map(r =>
        r.id === requestId ? { ...r, status: stateList.APROBADO, resolutionDetails: 'Aprobado' } : r
      )
    }));
    flush();

    const updatedWork = storage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(updatedWork?.state).toBe(stateList.SUSPENDIDO);

    const row = facade.tableData().find(r => r.id === thesisId);
    expect(row?.allowedActions).toContain('reactivar');
    expect(row?.allowedActions).not.toContain('ver');
  }));

  it('Decanatura NO debe ver "reactivar" aunque tenga acceso de lectura amplio sobre la tabla', fakeAsync(() => {
    const director = createMockUser({ id: directorId, firstName: 'Director' });

    mockCurrentUser.set({ id: 'decano-1' });
    mockHasAnyRole.mockImplementation((required: UserRoleType[]) => required.includes(UserRoleType.DECANATURA));

    storage['_thesisWorksList'].set([buildThesisWorkWithPendingSuspension(director)]);

    storage.updateWork(thesisId, w => ({
      ...w,
      state: stateList.SUSPENDIDO,
      specialRequests: w.specialRequests?.map(r =>
        r.id === requestId ? { ...r, status: stateList.APROBADO, resolutionDetails: 'Aprobado' } : r
      )
    }));
    flush();

    const row = facade.tableData().find(r => r.id === thesisId);
    expect(row).toBeDefined();
    expect(row?.allowedActions).not.toContain('reactivar');
  }));

  it('debe ocultar "reactivar" de nuevo y restaurar "ver" una vez que el trabajo se reactiva', fakeAsync(() => {
    const director = createMockUser({ id: directorId, firstName: 'Director' });

    mockCurrentUser.set({ id: 'admin-1' });
    mockHasAnyRole.mockImplementation((required: UserRoleType[]) => required.includes(UserRoleType.ADMINISTRADOR));

    storage['_thesisWorksList'].set([buildThesisWorkWithPendingSuspension(director)]);

    storage.updateWork(thesisId, w => ({
      ...w,
      state: stateList.SUSPENDIDO,
      specialRequests: w.specialRequests?.map(r =>
        r.id === requestId ? { ...r, status: stateList.APROBADO, resolutionDetails: 'Aprobado' } : r
      )
    }));
    flush();

    expect(facade.tableData().find(r => r.id === thesisId)?.allowedActions).toContain('reactivar');

    let successCalled = false;

    // CORRECCIÓN: Interceptamos la fachada para probar directamente la reactividad de la UI
    // sin depender del comportamiento opaco del mock del backend.
    jest.spyOn(facade, 'reactivateThesis').mockImplementation((id, onSuccess) => {
      storage.updateWork(id, w => ({ ...w, state: stateList.EN_DESARROLLO, isArchived: false }));
      onSuccess();
    });

    facade.reactivateThesis(thesisId, () => { successCalled = true; }, () => {});
    flush();

    expect(successCalled).toBe(true);
    const finalWork = storage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(finalWork?.state).toBe(stateList.EN_DESARROLLO);

    const finalRow = facade.tableData().find(r => r.id === thesisId);
    expect(finalRow?.allowedActions).not.toContain('reactivar');
    expect(finalRow?.allowedActions).toContain('ver');
  }));
});
