/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ProposalDocumentService } from './proposal-document.service';

describe('Service: ProposalDocument', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProposalDocumentService]
    });
  });

  it('should ...', inject([ProposalDocumentService], (service: ProposalDocumentService) => {
    expect(service).toBeTruthy();
  }));
});
