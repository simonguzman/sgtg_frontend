/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';

describe('Service: PreliminaryDraftStorage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [PreliminaryDraftStorageService]
    });
  });

  it('should ...', inject([PreliminaryDraftStorageService], (service: PreliminaryDraftStorageService) => {
    expect(service).toBeTruthy();
  }));
});
