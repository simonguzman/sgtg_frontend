/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { LoadedDocumentsThesisWorkFacadeService } from './loaded-documents-thesis-work-facade.service';

describe('Service: LoadedDocumentsThesisWorkFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadedDocumentsThesisWorkFacadeService]
    });
  });

  it('should ...', inject([LoadedDocumentsThesisWorkFacadeService], (service: LoadedDocumentsThesisWorkFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
