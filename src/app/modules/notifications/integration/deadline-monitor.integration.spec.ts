import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

// Servicios reales a evaluar
import { DeadlineMonitorService } from '../services/deadline-monitor.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { InboxStateService } from '../services/inbox-state.service';

// Fronteras simuladas (Mocks de los módulos externos)
import { ProposalService } from '../../proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../thesis-work/services/thesis-work.service';
import { UserService } from '../../users/services/user.service';

// Enums e Interfaces
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';

describe('Integración [Notifications]: Monitor de Plazos y Prevención de Duplicados', () => {
  let monitor: DeadlineMonitorService;
  let eventBus: EventBusService;
  let inboxState: InboxStateService;
  let eventBusSpy: jest.SpyInstance;

  // Helpers para simular fechas exactas relativas a "hoy"
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const addDays = (days: number): Date => {
    const date = new Date(today);
    date.setDate(date.getDate() + days);
    return date;
  };

  beforeEach(() => {
    // 1. Preparamos las bases de datos "señuelo" para que el monitor las lea
    const mockUsers = [
      { id: 'comite-1', roles: [UserRoleType.COMITE] },
      { id: 'evaluador-1', roles: [UserRoleType.EVALUADOR] }
    ];

    const mockProposals = [
      {
        id: 'prop-123',
        title: 'Propuesta a punto de vencer',
        state: stateList.EN_REVISION,
        evaluationDeadline: addDays(2) // Faltan 2 días (Debería lanzar WARNING)
      }
    ];

    const mockDrafts = [
      {
        preliminaryDraftId: 'draft-456',
        state: stateList.EN_REVISION,
        evaluationDeadline: addDays(-1), // Vencido hace 1 día (Debería lanzar EXPIRED)
        evaluators: [{ id: 'evaluador-1' }],
        proposalData: { title: 'Anteproyecto Vencido' }
      }
    ];

    TestBed.configureTestingModule({
      providers: [
        // La costura real que estamos evaluando
        DeadlineMonitorService,
        EventBusService,
        InboxStateService,

        // Inyectamos los mocks solo para la lectura de datos
        { provide: UserService, useValue: { users: signal(mockUsers) } },
        { provide: ProposalService, useValue: { proposals: signal(mockProposals) } },
        { provide: PreliminaryDraftService, useValue: { preliminaryDrafts: signal(mockDrafts) } },
        // Dejamos Tesis vacía para enfocarnos en los otros dos casos
        { provide: ThesisWorkService, useValue: { thesisWorks: signal([]) } }
      ]
    });

    monitor = TestBed.inject(DeadlineMonitorService);
    eventBus = TestBed.inject(EventBusService);
    inboxState = TestBed.inject(InboxStateService);

    // Espiamos al bus de eventos para ver qué mensajes grita el monitor
    eventBusSpy = jest.spyOn(eventBus, 'emit');

    localStorage.clear();
    // Vaciamos la bandeja para un estado limpio
    inboxState['_messages'].set([]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debe calcular los días restantes y emitir los eventos correctos a los usuarios correspondientes', () => {
    // Act: Disparamos el chequeo (lo que haría el MainLayoutComponent al cargar)
    monitor.checkDeadlines();

    // Assert 1: Debió emitir exactamente 2 eventos
    expect(eventBusSpy).toHaveBeenCalledTimes(2);

    // Assert 2: Validamos el Warning de la Propuesta (Enviado al Comité)
    expect(eventBusSpy).toHaveBeenCalledWith({
      type: AppEventType.PROPOSAL_DEADLINE_WARNING,
      targetUserIds: ['comite-1'],
      payload: {
        proposalId: 'prop-123',
        proposalTitle: 'Propuesta a punto de vencer',
        daysLeft: 2
      }
    });

    // Assert 3: Validamos el Vencimiento del Anteproyecto (Enviado al Evaluador)
    expect(eventBusSpy).toHaveBeenCalledWith({
      type: AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED,
      targetUserIds: ['evaluador-1'],
      payload: {
        preliminaryDraftId: 'draft-456',
        preliminaryDraftTitle: 'Anteproyecto Vencido',
        daysLeft: undefined // Porque ya está vencido
      }
    });
  });

  it('NO debe emitir notificaciones duplicadas si ya existe un aviso idéntico en la bandeja', () => {
    // Arrange: Simulamos que ayer el usuario ya recibió la notificación de "Warning"
    // para la propuesta (fijándonos en cómo el triggerIfUnique valida duplicados)
    inboxState.addMessages([{
      id: 'msg-viejo',
      userId: 'comite-1',
      type: 'SECURITY' as any,
      title: 'Recordatorio de Evaluación', // Mismo título que usa el triggerIfUnique
      message: '...',
      date: new Date(),
      status: 'leido',
      actionUrl: '/proposal/details/prop-123' // Mismo ID de la entidad
    }]);

    // Act: Disparamos el chequeo
    monitor.checkDeadlines();

    // Assert: Como ya existía el "Recordatorio de Evaluación" para 'prop-123',
    // el monitor debió omitir el evento de la Propuesta.
    // SOLO debió emitir el del Anteproyecto vencido (que no estaba en la bandeja).
    expect(eventBusSpy).toHaveBeenCalledTimes(1);
    expect(eventBusSpy).toHaveBeenCalledWith(expect.objectContaining({
      type: AppEventType.PRELIMINARY_DRAFT_DEADLINE_EXPIRED
    }));
  });
});
