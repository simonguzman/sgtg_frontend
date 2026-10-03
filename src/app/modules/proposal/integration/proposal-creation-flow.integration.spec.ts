import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';
import { ProposalApiService } from '../services/proposal-api.service';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { ProposalRulesService } from '../services/proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}


const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

describe('Integración [Proposal]: Ciclo de Vida y Cascada de Roles en Creación', () => {
  let proposalApi: ProposalApiService;
  let proposalStorage: ProposalStorageService;
  let userService: UserService;
  let userStorage: UserStorageService;
  let eventBus: EventBusService;
  let appRef: ApplicationRef;
  let injector: Injector;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        ProposalApiService,
        ProposalStorageService,
        ProposalRulesService,
        UserService,
        UserStorageService,
        EventBusService
      ]
    });

    proposalApi = TestBed.inject(ProposalApiService);
    proposalStorage = TestBed.inject(ProposalStorageService);
    userService = TestBed.inject(UserService);
    userStorage = TestBed.inject(UserStorageService);
    eventBus = TestBed.inject(EventBusService);
    appRef = TestBed.inject(ApplicationRef);
    injector = TestBed.inject(Injector);

    if (!proposalStorage.isHydrated()) {
      await firstValueFrom(
        toObservable(proposalStorage.isHydrated, { injector }).pipe(filter(v => v), take(1))
      );
    }

    const defaultMockUser = createMockUser({ id: 'user-001', firstName: 'Estudiante' });
    const defaultDoc1 = createMockUser({ id: 'doc-001', firstName: 'Doc1', roles: [UserRoleType.CODIRECTOR] });
    const defaultDoc2 = createMockUser({ id: 'doc-002', firstName: 'Doc2', roles: [UserRoleType.ASESOR] });
    const defaultDoc5 = createMockUser({ id: 'doc-005', firstName: 'Doc5', roles: [UserRoleType.DIRECTOR] });

    userStorage.updateUsersList(() => [defaultMockUser, defaultDoc1, defaultDoc2, defaultDoc5]);
    proposalStorage.updateProposals(() => []);
  });

  it('debe registrar la propuesta, otorgar roles automáticamente a los docentes y emitir el evento global', fakeAsync(() => {
    const director = createMockUser({
      id: 'doc-dir-99',
      firstName: 'María',
      roles: []
    });

    const codirector = createMockUser({
      id: 'doc-codir-88',
      firstName: 'Jorge',
      roles: []
    });

    userStorage.updateUsersList(current => [...current, director, codirector]);

    const newProposalPayloadPartial: Partial<Proposal> = {
      title: 'Sistema Inteligente de Riego',
      description: 'IoT para agricultura',
      modality: Modality.TI,
      authors: [],
      director: director,
      codirector: codirector,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    };

    const newProposalPayload = newProposalPayloadPartial as Proposal;

    const eventBusEmitSpy = jest.spyOn(eventBus, 'emit');

    let savedProposalResult: Proposal | undefined;
    proposalApi.createProposalMock(newProposalPayload).subscribe(res => {
      savedProposalResult = res;
    });

    tick(3000);
    appRef.tick();

    expect(savedProposalResult).toBeDefined();
    expect(savedProposalResult?.id).toBeDefined();
    expect(savedProposalResult?.state).toBe('En revisión');

    const updatedDirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-dir-99');
    const updatedCodirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-codir-88');

    expect(updatedDirector?.roles).toContain(UserRoleType.DIRECTOR);
    expect(updatedCodirector?.roles).toContain(UserRoleType.CODIRECTOR);

    expect(eventBusEmitSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: AppEventType.PROPOSAL_CREATED,
        payload: expect.objectContaining({
          proposalTitle: 'Sistema Inteligente de Riego'
        })
      })
    );
  }));
});
