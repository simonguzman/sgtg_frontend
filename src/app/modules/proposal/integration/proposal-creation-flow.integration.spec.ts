import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ApplicationRef, Injector } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

// Servicios reales a evaluar
import { ProposalApiService } from '../services/proposal-api.service';
import { ProposalStorageService } from '../services/proposal-storage.service';
import { ProposalRulesService } from '../services/proposal-rules.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

// Modelos y Enums
import { Proposal } from '../interfaces/proposal.interface';
import { Modality } from '../enums/modality.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { User } from '../../users/interfaces/user.interface';

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

describe('Integración [Proposal]: Ciclo de Vida y Cascada de Roles en Creación', () => {
  let proposalApi: ProposalApiService;
  let proposalStorage: ProposalStorageService;
  let userService: UserService;
  let userStorage: UserStorageService;
  let eventBus: EventBusService;
  let appRef: ApplicationRef;
  let injector: Injector;

  beforeEach(async () => {
    // Silenciamos todo error de consola generado por procesos asíncronos residuales
    jest.spyOn(console, 'error').mockImplementation(() => {});

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

    // Esperamos a que IndexedDB termine de cargar
    if (!proposalStorage.isHydrated()) {
      await firstValueFrom(
        toObservable(proposalStorage.isHydrated, { injector }).pipe(filter(v => v), take(1))
      );
    }

    // Arrange global: Sembramos los usuarios base requeridos
    const defaultMockUser = createMockUser({ id: 'user-001', firstName: 'Estudiante' });
    const defaultDoc1 = createMockUser({ id: 'doc-001', firstName: 'Doc1', roles: [UserRoleType.CODIRECTOR] });
    const defaultDoc2 = createMockUser({ id: 'doc-002', firstName: 'Doc2', roles: [UserRoleType.ASESOR] });
    const defaultDoc5 = createMockUser({ id: 'doc-005', firstName: 'Doc5', roles: [UserRoleType.DIRECTOR] });

    userStorage.updateUsersList(() => [defaultMockUser, defaultDoc1, defaultDoc2, defaultDoc5]);
    proposalStorage.updateProposals(() => []);

    // Eliminamos localStorage.clear() para evitar colisiones con fake-indexeddb
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe registrar la propuesta, otorgar roles automáticamente a los docentes y emitir el evento global', fakeAsync(() => {
    // 1. Sembramos al director y codirector específicos de este test
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

    const newProposalPayload: Proposal = {
      title: 'Sistema Inteligente de Riego',
      description: 'IoT para agricultura',
      modality: Modality.TI,
      authors: [],
      director: director,
      codirector: codirector,
      state: '' as any,
      createdAt: new Date(),
      documents: [],
      evaluations: []
    };

    const eventBusEmitSpy = jest.spyOn(eventBus, 'emit');

    // 2. Act: Ejecutamos la creación asíncrona
    let savedProposalResult: Proposal | undefined;
    proposalApi.createProposalMock(newProposalPayload).subscribe(res => {
      savedProposalResult = res;
    });

    // 🔥 EL FIX MÁGICO: 3000ms para asegurar que la cascada asíncrona (1000 + 1000) finalice por completo.
    tick(3000);
    appRef.tick();

    // 3. Assert 1: La propuesta fue guardada con éxito
    expect(savedProposalResult).toBeDefined();
    expect(savedProposalResult?.id).toBeDefined();
    expect(savedProposalResult?.state).toBe('En revisión');

    // 4. Assert 2: Consultamos el Storage y comprobamos los roles
    const updatedDirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-dir-99');
    const updatedCodirector = userStorage.getUsersSnapshot().find(u => u.id === 'doc-codir-88');

    expect(updatedDirector?.roles).toContain(UserRoleType.DIRECTOR);
    expect(updatedCodirector?.roles).toContain(UserRoleType.CODIRECTOR);

    // 5. Assert 3: El EventBus emitió la señal
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
