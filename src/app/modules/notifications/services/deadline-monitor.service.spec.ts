import { TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { DeadlineMonitorService } from './deadline-monitor.service';
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';
import { InboxStateService } from './inbox-state.service';
import { AppEventType, EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/models/user-role';

// --- INTERFACES LOCALES ESTRICTAS PARA MOCKS (SIN ANY) ---
interface TestProposal {
  id?: string;
  title: string;
  state: string;
  evaluationDeadline?: Date;
}

interface TestDraft {
  preliminaryDraftId?: string;
  state: string;
  evaluationDeadline?: Date;
  proposalData?: {
    title: string;
  };
  evaluators?: { id: string }[];
}

interface TestThesis {
  thesisWorkId: string;
  state: string;
  preliminaryDraftData?: {
    maximumDeliveryDate?: Date;
    proposalData?: {
      title?: string;
      authors?: { id: string }[];
      director?: { id: string };
      codirector?: { id: string };
      advisor?: { id: string };
    };
  };
}

interface TestUser {
  id: string;
  roles: UserRoleType[];
}

interface TestInboxMessage {
  actionUrl?: string;
  title: string;
}

interface MockEventBusService {
  emit: jest.Mock;
}

describe('Service: DeadlineMonitorService', () => {
  let service: DeadlineMonitorService;
  let eventBusMock: MockEventBusService;

  // Signals fuertemente tipados
  let proposalsSignal: WritableSignal<TestProposal[]>;
  let draftsSignal: WritableSignal<TestDraft[]>;
  let thesisSignal: WritableSignal<TestThesis[]>;
  let usersSignal: WritableSignal<TestUser[]>;
  let inboxSignal: WritableSignal<TestInboxMessage[]>;

  // Fecha fija para pruebas deterministas
  const SYSTEM_DATE = new Date('2026-06-19T10:00:00');

  beforeEach(() => {
    // 1. Congelar el tiempo enviando estrictamente los milisegundos de la época UNIX
    jest.useFakeTimers();
    jest.setSystemTime(SYSTEM_DATE.getTime());

    // 2. Inicializar los Signals con sus respectivos tipos estricto
    proposalsSignal = signal([]);
    draftsSignal = signal([]);
    thesisSignal = signal([]);
    usersSignal = signal([{ id: 'comite-1', roles: [UserRoleType.COMITE] }]);
    inboxSignal = signal([]);
    eventBusMock = { emit: jest.fn() };

    // 3. Configurar el TestBed con las dependencias estructuradas
    TestBed.configureTestingModule({
      providers: [
        DeadlineMonitorService,
        { provide: ProposalService, useValue: { proposals: proposalsSignal } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: draftsSignal } },
        { provide: ThesisWorkService, useValue: { thesisWorks: thesisSignal } },
        { provide: UserService, useValue: { users: usersSignal } },
        { provide: InboxStateService, useValue: { messagesSignal: inboxSignal } },
        { provide: EventBusService, useValue: eventBusMock }
      ]
    });

    service = TestBed.inject(DeadlineMonitorService);
  });

  afterEach(() => {
    // Restaurar el entorno de ejecución del reloj global
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('Debe crear el servicio', () => {
    expect(service).toBeTruthy();
  });

  describe('Revisión de Propuestas', () => {
    it('Debe emitir PROPOSAL_DEADLINE_EXPIRED si la fecha límite ya pasó', () => {
      const expiredDate = new Date('2026-06-15T00:00:00');

      proposalsSignal.set([{
        id: 'prop-1',
        title: 'Propuesta Vencida',
        state: stateList.EN_REVISION,
        evaluationDeadline: expiredDate
      }]);

      service.checkDeadlines();

      expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.PROPOSAL_DEADLINE_EXPIRED,
        targetUserIds: ['comite-1'],
        payload: expect.objectContaining({
          proposalId: 'prop-1',
          proposalTitle: 'Propuesta Vencida'
        })
      }));
    });

    it('Debe emitir PROPOSAL_DEADLINE_WARNING si faltan 3 días o menos', () => {
      const warningDate = new Date('2026-06-21T00:00:00');

      proposalsSignal.set([{
        id: 'prop-2',
        title: 'Propuesta Cerca de Vencer',
        state: stateList.EN_REVISION,
        evaluationDeadline: warningDate
      }]);

      service.checkDeadlines();

      expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.PROPOSAL_DEADLINE_WARNING,
        payload: expect.objectContaining({
          daysLeft: 2
        })
      }));
    });

    it('NO debe emitir evento si faltan más de 3 días', () => {
      const safeDate = new Date('2026-06-25T00:00:00');

      proposalsSignal.set([{
        id: 'prop-3',
        title: 'Propuesta Segura',
        state: stateList.EN_REVISION,
        evaluationDeadline: safeDate
      }]);

      service.checkDeadlines();

      expect(eventBusMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('Prevención de Notificaciones Duplicadas', () => {
    it('NO debe emitir evento si la notificación ya existe en el Inbox', () => {
      const warningDate = new Date('2026-06-20T00:00:00');

      proposalsSignal.set([{
        id: 'prop-unique',
        title: 'Propuesta Duplicada',
        state: stateList.EN_REVISION,
        evaluationDeadline: warningDate
      }]);

      inboxSignal.set([{
        actionUrl: '/proposal/details/prop-unique', // contiene el entityId evaluado internamente
        title: 'Recordatorio de Evaluación'
      }]);

      service.checkDeadlines();

      expect(eventBusMock.emit).not.toHaveBeenCalled();
    });
  });

  describe('Revisión de Trabajos de Grado', () => {
    it('Debe emitir THESIS_DEADLINE_WARNING y notificar a los autores y directores correctos', () => {
      const warningDate = new Date('2026-07-05T00:00:00');

      thesisSignal.set([{
        thesisWorkId: 'thesis-1',
        state: stateList.EN_DESARROLLO,
        preliminaryDraftData: {
          maximumDeliveryDate: warningDate,
          proposalData: {
            title: 'Tesis de Prueba',
            authors: [{ id: 'author-1' }, { id: 'author-2' }],
            director: { id: 'dir-1' },
            codirector: { id: 'codir-1' }
          }
        }
      }]);

      service.checkDeadlines();

      expect(eventBusMock.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.THESIS_DEADLINE_WARNING,
        targetUserIds: ['author-1', 'author-2', 'dir-1', 'codir-1'],
        payload: expect.objectContaining({
          thesisId: 'thesis-1',
          daysLeft: 16
        })
      }));
    });
  });
});
