/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ThesisWorkPageFacadeService } from './thesis-work-page-facade.service';

describe('Service: ThesisWorkPageFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisWorkPageFacadeService]
    });
  });

  it('should ...', inject([ThesisWorkPageFacadeService], (service: ThesisWorkPageFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
