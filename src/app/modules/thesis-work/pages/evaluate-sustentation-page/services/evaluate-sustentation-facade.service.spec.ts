/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateSustentationFacadeService } from './evaluate-sustentation-facade.service';

describe('Service: EvaluateSustentationFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateSustentationFacadeService]
    });
  });

  it('should ...', inject([EvaluateSustentationFacadeService], (service: EvaluateSustentationFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
