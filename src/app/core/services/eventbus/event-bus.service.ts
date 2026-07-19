import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { AppEvent } from '../../interfaces/app-event.interface';

@Injectable({
  providedIn: 'root'
})
export class EventBusService {
  private readonly eventSubject = new Subject<AppEvent>();
  events$ = this.eventSubject.asObservable();
  emit(event: AppEvent){
    this.eventSubject.next(event);
  }
}
