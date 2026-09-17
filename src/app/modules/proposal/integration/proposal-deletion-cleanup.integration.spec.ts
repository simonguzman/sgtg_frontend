import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { ApplicationRef, Injector } from '@angular/core';

// Servicios
import { ProposalApiService } from '../services/proposal-api.service';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { ProposalRulesService } from '../services/proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

// Helper de hidratación
import { waitForHydration } from '../../../testing/wait-for-hydration';

// Modelos y Enums
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

describe('Integración [Proposal]: Eliminación y Limpieza Condicional de Roles', () => {
  let proposalApi: ProposalApiService;
  let proposalStorage: ProposalStorageService;
  let userStorage: UserStorageService;
  let appRef: ApplicationRef;
  let injector: Injector;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        ProposalApiService, ProposalStorageService, ProposalRulesService,
        UserService, UserStorageService, EventBusService
      ]
    });

    proposalApi = TestBed.inject(ProposalApiService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userStorage = TestBed.inject(UserStorageService);
    appRef = TestBed.inject(ApplicationRef);
    injector = TestBed.inject(Injector);

    // Obligamos a instanciar las Reglas para que escuchen el EventBus
    TestBed.inject(ProposalRulesService);

    await waitForHydration(proposalStorage.isHydrated, injector);
    proposalStorage.updateProposals(() => []);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe mantener el rol si el docente está en otra propuesta, y removerlo si era la última', fakeAsync(() => {
    const sharedCodirector = createMockUser({
      id: 'doc-multi-1',
      firstName: 'Profesor',
      lastName: 'Compartido',
      roles: [UserRoleType.CODIRECTOR]
    });

    const directorDummy = createMockUser({ id: 'dir-99', roles: [UserRoleType.DIRECTOR] });
    userStorage.updateUsersList(() => [sharedCodirector, directorDummy]);

    const proposalA: Proposal = {
      id: 'prop-A', title: 'Proyecto Alpha', modality: Modality.TI, description: '',
      authors: [], director: directorDummy, codirector: sharedCodirector,
      state: stateList.EN_REVISION, createdAt: new Date(), documents: [], evaluations: []
    };

    const proposalB: Proposal = {
      id: 'prop-B', title: 'Proyecto Beta', modality: Modality.TI, description: '',
      authors: [], director: directorDummy, codirector: sharedCodirector,
      state: stateList.EN_REVISION, createdAt: new Date(), documents: [], evaluations: []
    };

    proposalStorage.updateProposals(() => [proposalA, proposalB]);

    // Act 1: Eliminamos SOLO la Propuesta A
    proposalApi.deleteProposalMock('prop-A').subscribe();

    // 🔥 FIX: Aumentamos el tick a 2500ms para asegurar que el delay(1000) de la propuesta
    // Y EL delay interno del userApiService (si lo tiene) terminen antes del assert.
    tick(2500);
    flush();
    appRef.tick();

    // Assert 1: La propuesta A se borró, pero el rol CODIRECTOR se mantiene
    expect(proposalStorage.getProposalsListSnapshot()).toHaveLength(1);
    let updatedCodirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-multi-1');
    expect(updatedCodirector?.roles).toContain(UserRoleType.CODIRECTOR);

    // Act 2: Eliminamos la Propuesta B (la última)
    proposalApi.deleteProposalMock('prop-B').subscribe();

    // 🔥 FIX: Misma lógica, damos tiempo suficiente a la cascada asíncrona
    tick(2500);
    flush();
    appRef.tick();

    // Assert 2: Ya no hay propuestas, el rol CODIRECTOR debe desaparecer
    expect(proposalStorage.getProposalsListSnapshot()).toHaveLength(0);
    updatedCodirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-multi-1');
    expect(updatedCodirector?.roles).not.toContain(UserRoleType.CODIRECTOR);
  }));
  it('debe mantener el rol ASESOR si el docente está en otra propuesta como advisor', fakeAsync(() => {
    const sharedAdvisor = createMockUser({ id: 'adv-multi-1', roles: [UserRoleType.ASESOR] });
    const directorDummy = createMockUser({ id: 'dir-adv-99', roles: [UserRoleType.DIRECTOR] });
    userStorage.updateUsersList(() => [sharedAdvisor, directorDummy]);

    const proposalA: Proposal = { id: 'prop-adv-A', title: 'Alpha', modality: Modality.PP, description: '',
      authors: [], director: directorDummy, advisor: sharedAdvisor, state: stateList.EN_REVISION,
      createdAt: new Date(), documents: [], evaluations: [] };
    const proposalB: Proposal = { ...proposalA, id: 'prop-adv-B', title: 'Beta' };
    proposalStorage.updateProposals(() => [proposalA, proposalB]);

    proposalApi.deleteProposalMock('prop-adv-A').subscribe();
    tick(2500); flush(); appRef.tick();

    expect(userStorage.getUsersSnapshot().find(u => u.id === 'adv-multi-1')?.roles).toContain(UserRoleType.ASESOR);
  }));
});
