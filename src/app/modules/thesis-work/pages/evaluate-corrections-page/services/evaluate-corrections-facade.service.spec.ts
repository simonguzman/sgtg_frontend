/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateCorrectionsFacadeService } from './evaluate-corrections-facade.service';

describe('Service: EvaluateCorrectionsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateCorrectionsFacadeService]
    });
  });

  it('should ...', inject([EvaluateCorrectionsFacadeService], (service: EvaluateCorrectionsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
