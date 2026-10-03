import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { DeadlineMonitorService } from '../services/deadline-monitor.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxStateService } from '../services/inbox-state.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { User } from '../../users/interfaces/user.interface';
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

describe('Integración [Notifications]: Rama de Trabajo de Grado en DeadlineMonitorService (umbral de 30 días)', () => {
  let monitor: DeadlineMonitorService;
  let eventBus: EventBusService;
  let eventBusSpy: jest.SpyInstance;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (days: number): Date => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterAll(() => {
    jest.restoreAllMocks();
  });
  function setup(maximumDeliveryDate: Date, state = stateList.EN_DESARROLLO) {
    const mockDirector: Partial<User> = { id: 'dir-thesis-1' };
    const mockProposalData: Partial<Proposal> = {
      title: 'Tesis con plazo',
      authors: [],
      director: mockDirector as User
    };
    const mockDraftData: Partial<PreliminaryDraft> = {
      maximumDeliveryDate,
      proposalData: mockProposalData as Proposal
    };
    const mockThesisWork: Partial<ThesisWork> = {
      thesisWorkId: 'thesis-789',
      state,
      preliminaryDraftData: mockDraftData as PreliminaryDraft
    };
    const mockThesisWorks: ThesisWork[] = [mockThesisWork as ThesisWork];
    TestBed.configureTestingModule({
      providers: [
        DeadlineMonitorService,
        EventBusService,
        InboxStateService,
        { provide: UserService, useValue: { users: signal([]) } },
        { provide: ProposalService, useValue: { proposals: signal([]) } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: signal([]) } },
        { provide: ThesisWorkService, useValue: { thesisWorks: signal(mockThesisWorks) } }
      ]
    });
    monitor = TestBed.inject(DeadlineMonitorService);
    eventBus = TestBed.inject(EventBusService);
    eventBusSpy = jest.spyOn(eventBus, 'emit');
    localStorage.clear();
  }
  it('debe emitir WARNING dentro del umbral de 30 días — donde Propuesta/Anteproyecto (umbral de 3) ya no aplicaría', () => {
    setup(addDays(25));
    monitor.checkDeadlines();
    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_DEADLINE_WARNING,
      targetUserIds: ['dir-thesis-1'],
      payload: expect.objectContaining({ thesisId: 'thesis-789', daysLeft: 25 })
    }));
  });
  it('NO debe emitir nada si faltan más de 30 días', () => {
    setup(addDays(45));
    monitor.checkDeadlines();
    expect(eventBusSpy).not.toHaveBeenCalled();
  });
  it('debe emitir EXPIRED si el plazo ya venció', () => {
    setup(addDays(-2));
    monitor.checkDeadlines();
    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.THESIS_DEADLINE_EXPIRED,
      targetUserIds: ['dir-thesis-1']
    }));
  });
  it('NO debe evaluar trabajos que no estén EN_DESARROLLO', () => {
    setup(addDays(-5), stateList.SUSPENDIDO);
    monitor.checkDeadlines();
    expect(eventBusSpy).not.toHaveBeenCalled();
  });
});
