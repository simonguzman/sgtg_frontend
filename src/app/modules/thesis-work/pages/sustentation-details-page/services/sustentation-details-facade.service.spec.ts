/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { SustentationDetailsFacadeService } from './sustentation-details-facade.service';

describe('Service: SustentationDetailsFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [SustentationDetailsFacadeService]
    });
  });

  it('should ...', inject([SustentationDetailsFacadeService], (service: SustentationDetailsFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
