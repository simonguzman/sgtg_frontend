/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { UploadAdvanceFormService } from './upload-advance-form.service';

describe('Service: UploadAdvanceForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UploadAdvanceFormService]
    });
  });

  it('should ...', inject([UploadAdvanceFormService], (service: UploadAdvanceFormService) => {
    expect(service).toBeTruthy();
  }));
});
