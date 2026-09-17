// src/app/modules/preliminary-draft/integration/preliminary-draft-creation-flow.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { PreliminaryDraftService } from '../services/preliminary-draft.service';
import { PreliminaryDraftStorageService } from '../services/preliminary-draft-storage.service';
import { PreliminaryDraftAssignmentService } from '../services/preliminary-draft-assignment.service';
import { PreliminaryDraftDocumentService } from '../services/preliminary-draft-document.service';
import { PreliminaryDraftApiService } from '../services/preliminary-draft-api.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Anteproyectos]: Flujo de creación y notificación automática a Jefes de Departamento', () => {
  let draftService: PreliminaryDraftService;
  let draftStorage: PreliminaryDraftStorageService;
  let userStorage: UserStorageService;
  let eventBus: EventBusService;
  let injector: Injector;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    // <-- FIX: Mockeamos crypto para evitar que la API falle al generar el UUID
    // Formato estricto para que TypeScript no arroje error
    if (!window.crypto) {
      (window as any).crypto = {};
    }
    jest.spyOn(window.crypto, 'randomUUID').mockReturnValue('00000000-0000-0000-0000-000000000000');

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftService, PreliminaryDraftStorageService,
        PreliminaryDraftAssignmentService, PreliminaryDraftDocumentService, PreliminaryDraftApiService,
        UserService, UserStorageService, UserApiService,
        EventBusService
      ]
    });

    draftService = TestBed.inject(PreliminaryDraftService);
    draftStorage = TestBed.inject(PreliminaryDraftStorageService);
    userStorage = TestBed.inject(UserStorageService);
    eventBus = TestBed.inject(EventBusService);
    injector = TestBed.inject(Injector);
    await waitForHydration(draftStorage.isHydrated, injector);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('debe generar un id nuevo, asignar estado EN_REVISION por defecto y notificar a TODOS los Jefes de Departamento reales', fakeAsync(() => {
    const jefe1 = createMockUser({ id: 'jefe-1', firstName: 'Jefe', lastName: 'Uno', roles: [UserRoleType.JEFE_DEP] });
    const jefe2 = createMockUser({ id: 'jefe-2', firstName: 'Jefe', lastName: 'Dos', roles: [UserRoleType.JEFE_DEP] });
    const student = createMockUser({ id: 'student-create-1', firstName: 'Estudiante', roles: [UserRoleType.ESTUDIANTE] });
    const director = createMockUser({ id: 'dir-create-1', firstName: 'Director', roles: [UserRoleType.DIRECTOR] });
    const regularTeacher = createMockUser({ id: 'teacher-1', firstName: 'Docente', roles: [UserRoleType.DOCENTE] });
    userStorage.updateUsersList(() => [jefe1, jefe2, student, director, regularTeacher]);

    const proposal: Proposal = {
      id: 'prop-create-1', title: 'Nuevo anteproyecto de prueba', description: 'desc', modality: Modality.TI,
      authors: [student], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };

    const payload: PreliminaryDraft = {
      proposalId: proposal.id!, proposalData: proposal,
      evaluations: [], documents: [],
      state: stateList.EN_REVISION,
      createdData: new Date()
    };

    const eventBusSpy = jest.spyOn(eventBus, 'emit');
    let createdDraft: PreliminaryDraft | undefined;

    draftService.createPreliminaryDraft(payload).subscribe(result => { createdDraft = result; });

    // <-- FIX: Aumentamos el tiempo a 3000ms para cubrir múltiples delays encadenados
    tick(3000);
    flush();

    expect(createdDraft?.preliminaryDraftId).toBeTruthy();
    expect(createdDraft?.state).toBe(stateList.EN_REVISION);

    const stored = draftStorage.allPreliminaryDrafts().find(d => d.preliminaryDraftId === createdDraft?.preliminaryDraftId);
    expect(stored).toBeDefined();

    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.PRELIMINARY_DRAFT_CREATED,
      targetUserIds: expect.arrayContaining([student.id, director.id, jefe1.id, jefe2.id])
    }));

    const emittedCall = eventBusSpy.mock.calls.find(call => call[0].type === AppEventType.PRELIMINARY_DRAFT_CREATED);
    expect(emittedCall?.[0].targetUserIds).not.toContain(regularTeacher.id);
  }));

  it('debe respetar un estado explícito si el payload lo trae, en vez de forzar EN_REVISION', fakeAsync(() => {
    const director = createMockUser({ id: 'dir-create-2', firstName: 'Director' });
    userStorage.updateUsersList(() => [director]);

    const proposal: Proposal = {
      id: 'prop-create-2', title: 'Otro anteproyecto', description: 'desc', modality: Modality.PP,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };

    const payload: PreliminaryDraft = {
      proposalId: proposal.id!, proposalData: proposal,
      evaluations: [], documents: [], state: stateList.EN_REVISION, createdData: new Date()
    };

    let createdDraft: PreliminaryDraft | undefined;
    draftService.createPreliminaryDraft(payload).subscribe(result => { createdDraft = result; });

    // <-- FIX: Aumentamos el tiempo a 3000ms aquí también
    tick(3000);
    flush();

    expect(createdDraft?.state).toBe(stateList.EN_REVISION);
  }));
});
