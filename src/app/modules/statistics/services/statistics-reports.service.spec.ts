/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { StatisticsReportsService } from './statistics-reports.service';

describe('Service: StatisticsReports', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [StatisticsReportsService]
    });
  });

  it('should ...', inject([StatisticsReportsService], (service: StatisticsReportsService) => {
    expect(service).toBeTruthy();
  }));
});
