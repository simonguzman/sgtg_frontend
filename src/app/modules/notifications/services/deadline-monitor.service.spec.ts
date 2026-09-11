import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { DeadlineMonitorService } from './deadline-monitor.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';
import { InboxStateService } from './inbox-state.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { InboxMessage } from '../interfaces/inbox-message.interface';

import * as thesisParticipantsHelper from '../../thesis-work/helpers/thesis-participants.helper';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ─────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default',
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-default',
  title: 'Default Title',
  state: stateList.EN_REVISION,
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-default',
  state: stateList.EN_REVISION,
  ...overrides
} as PreliminaryDraft);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-default',
  state: stateList.EN_DESARROLLO,
  ...overrides
} as ThesisWork);

const createMockInboxMessage = (overrides: Partial<InboxMessage> = {}): InboxMessage => ({
  id: 'msg-default',
  userId: 'user-default',
  type: NotificationType.INFO,
  title: 'Título por defecto',
  message: 'Cuerpo por defecto',
  date: new Date(),
  status: 'no leido',
  ...overrides
} as InboxMessage);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('DeadlineMonitorService', () => {
  let service: DeadlineMonitorService;
  let eventBusSpy: jest.SpyInstance;

  // Signals fuertemente tipados
  let mockProposals: WritableSignal<Proposal[]>;
  let mockDrafts: WritableSignal<PreliminaryDraft[]>;
  let mockThesis: WritableSignal<ThesisWork[]>;
  let mockUsers: WritableSignal<User[]>;
  let mockMessages: WritableSignal<InboxMessage[]>;

  const FIXED_TODAY = new Date('2026-08-10T12:00:00.000Z');

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Congelamos el tiempo para pruebas deterministas
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_TODAY.getTime());

    // Inicializamos con el tipado correcto
    mockProposals = signal<Proposal[]>([]);
    mockDrafts = signal<PreliminaryDraft[]>([]);
    mockThesis = signal<ThesisWork[]>([]);
    mockUsers = signal<User[]>([]);
    mockMessages = signal<InboxMessage[]>([]);

    const mockEventBus = { emit: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        DeadlineMonitorService,
        { provide: ProposalService, useValue: { proposals: mockProposals } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: mockDrafts } },
        { provide: ThesisWorkService, useValue: { thesisWorks: mockThesis } },
        { provide: UserService, useValue: { users: mockUsers } },
        { provide: InboxStateService, useValue: { messagesSignal: mockMessages } },
        { provide: EventBusService, useValue: mockEventBus },
      ]
    });

    service = TestBed.inject(DeadlineMonitorService);
    const eventBus = TestBed.inject(EventBusService);
    eventBusSpy = jest.spyOn(eventBus, 'emit');

    // 🔹 REFACTOR: Usamos la fábrica en lugar de casteos inseguros
    mockUsers.set([
      createMockUser({ id: 'comite-1', roles: [UserRoleType.COMITE] })
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('checkProposalDeadlines', () => {
    it('debe emitir alerta de VENCIDO si los días restantes son menores a 0', () => {
      mockProposals.set([
        createMockProposal({
          id: 'prop-1',
          title: 'Propuesta A',
          state: stateList.EN_REVISION,
          evaluationDeadline: new Date('2026-08-09T10:00:00.000Z')
        })
      ]);

      service.checkDeadlines();

      expect(eventBusSpy).toHaveBeenCalledWith({
        type: AppEventType.PROPOSAL_DEADLINE_EXPIRED,
        targetUserIds: ['comite-1'],
        payload: {
          daysLeft: undefined,
          proposalId: 'prop-1',
          proposalTitle: 'Propuesta A'
        }
      });
    });

    it('debe emitir alerta de RECORDATORIO si los días restantes son <= 3 y >= 0', () => {
      mockProposals.set([
        createMockProposal({
          id: 'prop-2',
          title: 'Propuesta B',
          state: stateList.EN_REVISION,
          evaluationDeadline: new Date('2026-08-12T10:00:00.000Z')
        })
      ]);

      service.checkDeadlines();

      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: AppEventType.PROPOSAL_DEADLINE_WARNING })
      );
    });
  });

  describe('checkPreliminaryDraftDeadlines', () => {
    it('debe emitir alerta y notificar a los evaluadores del anteproyecto', () => {
      mockDrafts.set([
        createMockPreliminaryDraft({
          preliminaryDraftId: 'draft-1',
          state: stateList.EN_REVISION,
          evaluationDeadline: new Date('2026-08-09T10:00:00.000Z'),
          proposalData: createMockProposal({ title: 'Anteproyecto Título' }),
          evaluators: [
            createMockUser({ id: 'eval-1' }),
            createMockUser({ id: 'eval-2' })
          ]
        })
      ]);

      service.checkDeadlines();

      expect(eventBusSpy).toHaveBeenCalledWith({
        type: AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED,
        targetUserIds: ['eval-1', 'eval-2'],
        payload: {
          daysLeft: undefined,
          preliminaryDraftId: 'draft-1',
          preliminaryDraftTitle: 'Anteproyecto Título'
        }
      });
    });
  });

  describe('checkThesisDeadlines', () => {
    it('debe usar collectParticipantIds para los stakeholders y emitir alerta', () => {
      const helperSpy = jest.spyOn(thesisParticipantsHelper, 'collectParticipantIds')
        .mockReturnValue(['thesis-user-1', 'thesis-user-2']);

      mockThesis.set([
        createMockThesisWork({
          thesisWorkId: 'thesis-1',
          state: stateList.EN_DESARROLLO,
          preliminaryDraftData: createMockPreliminaryDraft({
            maximumDeliveryDate: new Date('2026-08-25T10:00:00.000Z'),
            proposalData: createMockProposal({ title: 'Tesis de Prueba' })
          })
        })
      ]);

      service.checkDeadlines();

      expect(helperSpy).toHaveBeenCalled();
      expect(eventBusSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.THESIS_DEADLINE_WARNING,
          targetUserIds: ['thesis-user-1', 'thesis-user-2'],
          payload: expect.objectContaining({ daysLeft: 15 })
        })
      );
    });
  });

  describe('Lógica genérica (triggerIfUnique)', () => {
    it('NO debe emitir evento si la notificación ya existe en el inbox', () => {
      mockProposals.set([
        createMockProposal({
          id: 'prop-already-notified',
          title: 'Propuesta Notificada',
          state: stateList.EN_REVISION,
          evaluationDeadline: new Date('2026-08-09T10:00:00.000Z')
        })
      ]);

      mockMessages.set([
        createMockInboxMessage({
          title: 'Plazo Vencido',
          actionUrl: '/some/path/prop-already-notified/details'
        })
      ]);

      service.checkDeadlines();

      expect(eventBusSpy).not.toHaveBeenCalled();
    });
  });
});
