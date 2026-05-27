/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { PreliminaryDraftAssignmentService } from './preliminary-draft-assignment.service';

describe('Service: PreliminaryDraftAssignment', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreliminaryDraftAssignmentService]
    });
  });

  it('should ...', inject([PreliminaryDraftAssignmentService], (service: PreliminaryDraftAssignmentService) => {
    expect(service).toBeTruthy();
  }));
});
