/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterCorrespondenceFormService } from './register-correspondence-form.service';

describe('Service: RegisterCorrespondenceForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterCorrespondenceFormService]
    });
  });

  it('should ...', inject([RegisterCorrespondenceFormService], (service: RegisterCorrespondenceFormService) => {
    expect(service).toBeTruthy();
  }));
});
