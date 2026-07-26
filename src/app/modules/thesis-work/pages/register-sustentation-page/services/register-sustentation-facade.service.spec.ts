/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { RegisterSustentationFacadeService } from './register-sustentation-facade.service';

describe('Service: RegisterSustentationFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RegisterSustentationFacadeService]
    });
  });

  it('should ...', inject([RegisterSustentationFacadeService], (service: RegisterSustentationFacadeService) => {
    expect(service).toBeTruthy();
  }));
});
