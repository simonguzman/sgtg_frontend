import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';

import { EventBusService } from './event-bus.service';
import { AppEvent } from '../../interfaces/app-event.interface';
import { AppEventType } from '../../enums/app-event-type.enum';

// Factory para generar mocks limpios y tipados
function createMockAppEvent(overrides: Partial<AppEvent> = {}): AppEvent {
  return {
    type: AppEventType.PROPOSAL_CREATED,
    targetUserIds: ['user-1'],
    payload: { id: 'entity-1' },
    ...overrides
  } as AppEvent;
}

describe('EventBusService', () => {
  let service: EventBusService;
  let subscriptions: Subscription[] = [];

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventBusService]
    });
    service = TestBed.inject(EventBusService);
  });

  // Limpieza de suscripciones para evitar memory leaks en Jest
  afterEach(() => {
    subscriptions.forEach(sub => sub.unsubscribe());
    subscriptions = [];
  });

  describe('Inicialización', () => {
    it('debe crearse correctamente', () => {
      expect(service).toBeTruthy();
    });
  });

  describe('Emisión y Suscripción (Pub/Sub)', () => {
    it('debe emitir un evento a un suscriptor activo', () => {
      const received: AppEvent[] = [];

      const sub = service.events$.subscribe(event => received.push(event));
      subscriptions.push(sub);

      const mockEvent = createMockAppEvent();
      service.emit(mockEvent);

      expect(received).toEqual([mockEvent]);
    });

    it('debe notificar a múltiples suscriptores del mismo evento (multicast)', () => {
      const receivedA: AppEvent[] = [];
      const receivedB: AppEvent[] = [];

      subscriptions.push(service.events$.subscribe(event => receivedA.push(event)));
      subscriptions.push(service.events$.subscribe(event => receivedB.push(event)));

      const mockEvent = createMockAppEvent({ type: AppEventType.THESIS_REACTIVATED });
      service.emit(mockEvent);

      expect(receivedA).toEqual([mockEvent]);
      expect(receivedB).toEqual([mockEvent]);
    });

    it('debe preservar el orden de emisión para un mismo suscriptor', () => {
      const received: AppEvent[] = [];

      subscriptions.push(service.events$.subscribe(event => received.push(event)));

      const firstEvent = createMockAppEvent({ type: AppEventType.PROPOSAL_CREATED });
      const secondEvent = createMockAppEvent({ type: AppEventType.THESIS_DEADLINE_EXPIRED });

      service.emit(firstEvent);
      service.emit(secondEvent);

      expect(received).toEqual([firstEvent, secondEvent]);
    });
  });

  describe('Comportamiento de Subject vs BehaviorSubject', () => {
    it('NO debe reproducir eventos pasados a un suscriptor tardío', () => {
      // Se emite ANTES de que haya suscriptores
      service.emit(createMockAppEvent());

      const receivedLate: AppEvent[] = [];
      subscriptions.push(service.events$.subscribe(event => receivedLate.push(event)));

      expect(receivedLate).toEqual([]); // El arreglo debe estar vacío
    });

    it('no debe lanzar error al emitir sin ningún suscriptor activo', () => {
      expect(() => service.emit(createMockAppEvent())).not.toThrow();
    });
  });
});
