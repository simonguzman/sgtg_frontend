/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { UploadAdvancePageFacadeService } from './upload-advance-page-facade.service';

describe('Service: PloadAdvancePageFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UploadAdvancePageFacadeService]
    });
  });

  it('should ...', inject([UploadAdvancePageFacadeService], (service: UploadAdvancePageFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
