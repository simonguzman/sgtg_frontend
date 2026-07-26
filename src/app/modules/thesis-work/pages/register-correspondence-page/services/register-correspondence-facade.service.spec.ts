/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterCorrespondenceFacadeService } from './register-correspondence-facade.service';

describe('Service: RegisterCorrespondenceFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterCorrespondenceFacadeService]
    });
  });

  it('should ...', inject([RegisterCorrespondenceFacadeService], (service: RegisterCorrespondenceFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
