/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterSpecialRequestFacadeService } from './register-special-request-facade.service';

describe('Service: RegisterSpecialRequestFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterSpecialRequestFacadeService]
    });
  });

  it('should ...', inject([RegisterSpecialRequestFacadeService], (service: RegisterSpecialRequestFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
