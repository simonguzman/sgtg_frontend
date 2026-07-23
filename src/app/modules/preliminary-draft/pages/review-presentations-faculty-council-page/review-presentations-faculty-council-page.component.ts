import { Component, inject, OnInit } from '@angular/core';

import { ReviewPresentationsFacultyCouncilPageFacadeService } from './services/review-presentations-faculty-council-page-facade.service';

import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { ReviewPresentationsFacultyCouncilFormComponent } from '../../components/review-presentations-faculty-council-form/review-presentations-faculty-council-form.component';

@Component({
  selector: 'app-review-presentations-faculty-council-page',
  standalone: true,
  imports: [ReviewPresentationsFacultyCouncilFormComponent, ConfirmationActionModalComponent],
  providers: [ReviewPresentationsFacultyCouncilPageFacadeService],
  templateUrl: './review-presentations-faculty-council-page.component.html',
  styleUrls: ['./review-presentations-faculty-council-page.component.css']
})
export class ReviewPresentationsFacultyCouncilPageComponent implements OnInit {
  readonly facade = inject(ReviewPresentationsFacultyCouncilPageFacadeService);

  ngOnInit(): void {
    this.facade.loadData();
  }
}
