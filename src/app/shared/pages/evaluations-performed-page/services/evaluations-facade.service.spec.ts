/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluationsFacadeService } from './evaluations-facade.service';

describe('Service: EvaluationsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluationsFacadeService]
    });
  });

  it('should ...', inject([EvaluationsFacadeService], (service: EvaluationsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
