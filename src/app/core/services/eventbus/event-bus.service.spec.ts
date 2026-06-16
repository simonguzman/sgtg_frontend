/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { EventBusService } from './event-bus.service';

describe('Service: EventBus', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EventBusService]
    });
  });

  it('should ...', inject([EventBusService], (service: EventBusService) => {
    expect(service).toBeTruthy();
  }));
});
