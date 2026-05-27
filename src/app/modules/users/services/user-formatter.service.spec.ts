/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { UserFormatterService } from './user-formatter.service';

describe('Service: UserFormatter', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [UserFormatterService]
    });
  });

  it('should ...', inject([UserFormatterService], (service: UserFormatterService) => {
    expect(service).toBeTruthy();
  }));
});
