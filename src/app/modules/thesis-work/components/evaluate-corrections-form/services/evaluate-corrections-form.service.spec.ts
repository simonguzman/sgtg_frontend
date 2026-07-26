/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateCorrectionsFormService } from './evaluate-corrections-form.service';

describe('Service: EvaluateCorrectionsForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateCorrectionsFormService]
    });
  });

  it('should ...', inject([EvaluateCorrectionsFormService], (service: EvaluateCorrectionsFormService) => {
    expect(service).toBeTruthy();
  }));
});
