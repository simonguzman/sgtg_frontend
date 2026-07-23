/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ThesisWorkPageMapperService } from './thesis-work-page-mapper.service';

describe('Service: ThesisWorkPageMapper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ThesisWorkPageMapperService]
    });
  });

  it('should ...', inject([ThesisWorkPageMapperService], (service: ThesisWorkPageMapperService) => {
    expect(service).toBeTruthy();
  }));
});
