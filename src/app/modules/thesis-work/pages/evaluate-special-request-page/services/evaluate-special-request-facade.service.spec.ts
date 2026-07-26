/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateSpecialRequestFacadeService } from './evaluate-special-request-facade.service';

describe('Service: EvaluateSpecialRequestFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateSpecialRequestFacadeService]
    });
  });

  it('should ...', inject([EvaluateSpecialRequestFacadeService], (service: EvaluateSpecialRequestFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
