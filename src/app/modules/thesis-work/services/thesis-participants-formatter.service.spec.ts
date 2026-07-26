/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ThesisParticipantsFormatterService } from './thesis-participants-formatter.service';

describe('Service: ThesisParticipantsFormatter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisParticipantsFormatterService]
    });
  });

  it('should ...', inject([ThesisParticipantsFormatterService], (service: ThesisParticipantsFormatterService) => {
    expect(service).toBeTruthy();
  }));
});
