import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { AppEvent } from '../../interfaces/app-event.interface';

@Injectable({
  providedIn: 'root'
})
export class EventBusService {
  private readonly eventSubject = new Subject<AppEvent>();

  // ← readonly + tipo explícito Observable<AppEvent>: consistente con el
  // resto de streams públicos del proyecto (InboxStateService.messagesSignal,
  // etc.), donde nada expuesto hacia afuera queda sin `readonly` ni con
  // tipo inferido.
  readonly events$: Observable<AppEvent> = this.eventSubject.asObservable();

  emit(event: AppEvent): void {
    this.eventSubject.next(event);
  }
}
