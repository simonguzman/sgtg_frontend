/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterSpecialRequestFormService } from './register-special-request-form.service';

describe('Service: RegisterSpecialRequestForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterSpecialRequestFormService]
    });
  });

  it('should ...', inject([RegisterSpecialRequestFormService], (service: RegisterSpecialRequestFormService) => {
    expect(service).toBeTruthy();
  }));
});
