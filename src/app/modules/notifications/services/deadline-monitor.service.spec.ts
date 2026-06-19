/* tslint:disable:no-unused-variable */

import { TestBed, inject } from '@angular/core/testing';
import { DeadlineMonitorService } from './deadline-monitor.service';

describe('Service: DeadlineMonitor', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [DeadlineMonitorService]
    });
  });

  it('should ...', inject([DeadlineMonitorService], (service: DeadlineMonitorService) => {
    expect(service).toBeTruthy();
  }));
});
