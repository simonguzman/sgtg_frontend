/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterSustentationFormService } from './register-sustentation-form.service';

describe('Service: RegisterSustentationForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterSustentationFormService]
    });
  });

  it('should ...', inject([RegisterSustentationFormService], (service: RegisterSustentationFormService) => {
    expect(service).toBeTruthy();
  }));
});
