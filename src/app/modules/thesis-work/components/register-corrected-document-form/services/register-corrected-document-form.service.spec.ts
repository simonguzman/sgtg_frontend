/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterCorrectedDocumentFormService } from './register-corrected-document-form.service';

describe('Service: RegisterCorrectedDocumentForm', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterCorrectedDocumentFormService]
    });
  });

  it('should ...', inject([RegisterCorrectedDocumentFormService], (service: RegisterCorrectedDocumentFormService) => {
    expect(service).toBeTruthy();
  }));
});
