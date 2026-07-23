import { Component, inject, OnInit } from '@angular/core';

import { ReviewPreliminaryDraftPageFacadeService } from './services/review-preliminary-draft-page-facade.service';

import { ReviewPreliminaryDraftFormComponent } from "../../components/review-preliminary-draft-form/review-preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-review-preliminary-draft-page',
  templateUrl: './review-preliminary-draft-page.component.html',
  styleUrls: ['./review-preliminary-draft-page.component.css'],
  imports: [ReviewPreliminaryDraftFormComponent, ConfirmationActionModalComponent],
  providers: [ReviewPreliminaryDraftPageFacadeService]
})
export class ReviewPreliminaryDraftPageComponent implements OnInit {
  readonly facade = inject(ReviewPreliminaryDraftPageFacadeService);

  ngOnInit(): void {
    this.facade.init();
  }
}
