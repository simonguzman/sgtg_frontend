/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateAdvanceFacadeService } from './evaluate-advance-facade.service';

describe('Service: EvaluateAdvanceFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateAdvanceFacadeService]
    });
  });

  it('should ...', inject([EvaluateAdvanceFacadeService], (service: EvaluateAdvanceFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
