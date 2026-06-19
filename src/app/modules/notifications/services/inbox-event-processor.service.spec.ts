/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { InboxEventProcessorService } from './inbox-event-processor.service';

describe('Service: InboxEventProcessor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InboxEventProcessorService]
    });
  });

  it('should ...', inject([InboxEventProcessorService], (service: InboxEventProcessorService) => {
    expect(service).toBeTruthy();
  }));
});
