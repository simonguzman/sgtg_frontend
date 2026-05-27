/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';

describe('Service: PreliminaryDraftDocument', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreliminaryDraftDocumentService]
    });
  });

  it('should ...', inject([PreliminaryDraftDocumentService], (service: PreliminaryDraftDocumentService) => {
    expect(service).toBeTruthy();
  }));
});
