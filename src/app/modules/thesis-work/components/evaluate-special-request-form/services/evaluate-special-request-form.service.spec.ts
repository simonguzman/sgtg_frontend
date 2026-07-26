/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { EvaluateSpecialRequestFormService } from './evaluate-special-request-form.service';

describe('Service: EvaluateSpecialRequestForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [EvaluateSpecialRequestFormService]
    });
  });

  it('should ...', inject([EvaluateSpecialRequestFormService], (service: EvaluateSpecialRequestFormService) => {
    expect(service).toBeTruthy();
  }));
});
