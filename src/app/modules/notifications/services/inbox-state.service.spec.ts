/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { InboxStateService } from './inbox-state.service';

describe('Service: InboxState', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [InboxStateService]
    });
  });

  it('should ...', inject([InboxStateService], (service: InboxStateService) => {
    expect(service).toBeTruthy();
  }));
});
