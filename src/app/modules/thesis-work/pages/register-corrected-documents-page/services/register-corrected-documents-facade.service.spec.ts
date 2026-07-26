/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterCorrectedDocumentsFacadeService } from './register-corrected-documents-facade.service';

describe('Service: RegisterCorrectedDocumentsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterCorrectedDocumentsFacadeService]
    });
  });

  it('should ...', inject([RegisterCorrectedDocumentsFacadeService], (service: RegisterCorrectedDocumentsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
