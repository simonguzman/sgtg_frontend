/* tslint:disable:no-unused-variable */

import { TestBed, async, inject } from '@angular/core/testing';
import { ProposalRulesService } from './proposal-rules.service';

describe('Service: ProposalRules', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ProposalRulesService]
    });
  });

  it('should ...', inject([ProposalRulesService], (service: ProposalRulesService) => {
    expect(service).toBeTruthy();
  }));
});
