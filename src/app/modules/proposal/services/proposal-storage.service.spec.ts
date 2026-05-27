/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ProposalStorageService } from './proposal-storage.service';

describe('Service: ProposalStorage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProposalStorageService]
    });
  });

  it('should ...', inject([ProposalStorageService], (service: ProposalStorageService) => {
    expect(service).toBeTruthy();
  }));
});
