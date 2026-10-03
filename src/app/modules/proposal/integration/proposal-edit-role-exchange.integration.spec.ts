import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';
import { ProposalApiService } from '../services/proposal-api.service';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { ProposalRulesService } from '../services/proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', secondName: '', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
} as User);

describe('Integración [Proposal]: Edición — intercambio real de roles al cambiar codirector/asesor', () => {
  let proposalApi: ProposalApiService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;

  const proposalId = 'prop-edit-1';
  const directorId = 'dir-edit-1';

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        ProposalApiService, ProposalStorageService, ProposalRulesService,
        UserService, UserStorageService, UserApiService, EventBusService
      ]
    });

    proposalApi = TestBed.inject(ProposalApiService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userStorage = TestBed.inject(UserStorageService);
    const injector = TestBed.inject(Injector);

    await waitForHydration(proposalStorage.isHydrated, injector);
    proposalStorage.updateProposals(() => []);
  });

  it('debe retirar el rol CODIRECTOR al antiguo y otorgarlo al nuevo cuando se reemplaza en edición', fakeAsync(() => {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const oldCodirector = createMockUser({ id: 'codir-old-1', firstName: 'Codirector Viejo', roles: [UserRoleType.CODIRECTOR] });
    const newCodirector = createMockUser({ id: 'codir-new-1', firstName: 'Codirector Nuevo', roles: [] });
    userStorage.updateUsersList(() => [director, oldCodirector, newCodirector]);

    const originalProposalPartial: Partial<Proposal> = {
      id: proposalId, title: 'Propuesta a editar', description: 'desc', modality: Modality.TI,
      authors: [], director, codirector: oldCodirector, state: stateList.EN_REVISION,
      createdAt: new Date(), documents: [], evaluations: [], isArchived: false
    };
    const originalProposal = originalProposalPartial as Proposal;

    proposalStorage.updateProposals(() => [originalProposal]);

    let updated: Proposal | undefined;

    proposalApi.updateProposalMock(proposalId, { codirector: newCodirector }).subscribe({
      next: result => { updated = result; },
      error: err => { fail('La suscripción falló inesperadamente: ' + JSON.stringify(err)); }
    });

    tick(3000);
    flush();

    expect(updated).toBeDefined();
    expect(updated?.codirector?.id).toBe(newCodirector.id);
    expect(proposalStorage.getProposalsListSnapshot().find(p => p.id === proposalId)?.codirector?.id).toBe(newCodirector.id);

    const users = userStorage.getUsersSnapshot();
    expect(users.find(u => u.id === 'codir-old-1')?.roles).not.toContain(UserRoleType.CODIRECTOR);
    expect(users.find(u => u.id === 'codir-new-1')?.roles).toContain(UserRoleType.CODIRECTOR);
  }));

  it('debe retirar el rol de ASESOR sin otorgar ninguno nuevo si el campo se limpia por completo', fakeAsync(() => {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const advisor = createMockUser({ id: 'advisor-remove-1', firstName: 'Asesor', roles: [UserRoleType.ASESOR] });
    userStorage.updateUsersList(() => [director, advisor]);

    const originalProposalPartial: Partial<Proposal> = {
      id: 'prop-edit-2', title: 'Propuesta con asesor', description: 'desc', modality: Modality.PP,
      authors: [], director, advisor, state: stateList.EN_REVISION,
      createdAt: new Date(), documents: [], evaluations: [], isArchived: false
    };
    const originalProposal = originalProposalPartial as Proposal;

    proposalStorage.updateProposals(() => [originalProposal]);

    let updated: Proposal | undefined;

    proposalApi.updateProposalMock('prop-edit-2', { advisor: undefined }).subscribe({
      next: result => { updated = result; },
      error: err => { fail('La suscripción falló inesperadamente: ' + JSON.stringify(err)); }
    });

    tick(3000);
    flush();

    expect(updated).toBeDefined();
    expect(userStorage.getUsersSnapshot().find(u => u.id === 'advisor-remove-1')?.roles).not.toContain(UserRoleType.ASESOR);
  }));
});
