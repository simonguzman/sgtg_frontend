/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { CorrectedDocumentsFacadeService } from './corrected-documents-facade.service';

describe('Service: CorrectedDocumentsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CorrectedDocumentsFacadeService]
    });
  });

  it('should ...', inject([CorrectedDocumentsFacadeService], (service: CorrectedDocumentsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
