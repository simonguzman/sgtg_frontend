/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ThesisWorkDetailsFacadeService } from './thesis-work-details-facade.service';

describe('Service: ThesisWorkDetailsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisWorkDetailsFacadeService]
    });
  });

  it('should ...', inject([ThesisWorkDetailsFacadeService], (service: ThesisWorkDetailsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
