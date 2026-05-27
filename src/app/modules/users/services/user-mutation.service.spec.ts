/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { UserMutationService } from './user-mutation.service';

describe('Service: UserMutation', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserMutationService]
    });
  });

  it('should ...', inject([UserMutationService], (service: UserMutationService) => {
    expect(service).toBeTruthy();
  }));
});
