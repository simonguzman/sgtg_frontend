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
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';
if (typeof structuredClone === 'undefined') {
  global.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

describe('Integración [Notifications]: Monitor de Plazos y Prevención de Duplicados', () => {
  let monitor: DeadlineMonitorService;
  let eventBus: EventBusService;
  let inboxState: InboxStateService;
  let eventBusSpy: jest.SpyInstance;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (days: number): Date => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const mockUsers = [
      { id: 'comite-1', roles: [UserRoleType.COMITE] },
      { id: 'evaluador-1', roles: [UserRoleType.EVALUADOR] }
    ];
    const mockProposals = [
      {
        id: 'prop-123',
        title: 'Propuesta a punto de vencer',
        state: stateList.EN_REVISION,
        evaluationDeadline: addDays(2)
      }
    ];
    const mockDrafts = [
      {
        preliminaryDraftId: 'draft-456',
        state: stateList.EN_REVISION,
        evaluationDeadline: addDays(-1),
        evaluators: [{ id: 'evaluador-1' }],
        proposalData: { title: 'Anteproyecto Vencido' }
      }
    ];
    TestBed.configureTestingModule({
      providers: [
        DeadlineMonitorService,
        EventBusService,
        InboxStateService,
        { provide: UserService, useValue: { users: signal(mockUsers) } },
        { provide: ProposalService, useValue: { proposals: signal(mockProposals) } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: signal(mockDrafts) } },
        { provide: ThesisWorkService, useValue: { thesisWorks: signal([]) } }
      ]
    });
    monitor = TestBed.inject(DeadlineMonitorService);
    eventBus = TestBed.inject(EventBusService);
    inboxState = TestBed.inject(InboxStateService);
    eventBusSpy = jest.spyOn(eventBus, 'emit');
    localStorage.clear();
    inboxState['_messages'].set([]);
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });
  it('debe calcular los días restantes y emitir los eventos correctos a los usuarios correspondientes', () => {
    monitor.checkDeadlines();
    expect(eventBusSpy).toHaveBeenCalledTimes(2);
    expect(eventBusSpy).toHaveBeenCalledWith({
      type: AppEventType.PROPOSAL_DEADLINE_WARNING,
      targetUserIds: ['comite-1'],
      payload: {
        proposalId: 'prop-123',
        proposalTitle: 'Propuesta a punto de vencer',
        daysLeft: 2
      }
    });
    expect(eventBusSpy).toHaveBeenCalledWith({
      type: AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED,
      targetUserIds: ['evaluador-1'],
      payload: {
        preliminaryDraftId: 'draft-456',
        preliminaryDraftTitle: 'Anteproyecto Vencido',
        daysLeft: undefined
      }
    });
  });
  it('NO debe emitir notificaciones duplicadas si ya existe un aviso idéntico en la bandeja', () => {
    type InboxMessage = Parameters<typeof inboxState.addMessages>[0][0];
    const oldMessage: InboxMessage = {
      id: 'msg-viejo',
      userId: 'comite-1',
      type: NotificationType.SECURITY,
      title: 'Recordatorio de Evaluación',
      message: '...',
      date: new Date(),
      status: 'leido',
      actionUrl: '/proposal/details/prop-123'
    };
    inboxState.addMessages([oldMessage]);
    monitor.checkDeadlines();
    expect(eventBusSpy).toHaveBeenCalledTimes(1);
    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED
    }));
  });
});
