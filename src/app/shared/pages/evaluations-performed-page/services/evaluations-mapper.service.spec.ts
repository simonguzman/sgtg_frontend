/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluationsMapperService } from './evaluations-mapper.service';

describe('Service: EvaluationsMapper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluationsMapperService]
    });
  });

  it('should ...', inject([EvaluationsMapperService], (service: EvaluationsMapperService) => {
    expect(service).toBeTruthy();
  }));
});
