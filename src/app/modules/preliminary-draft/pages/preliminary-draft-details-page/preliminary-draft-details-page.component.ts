import { Component, inject, OnInit } from '@angular/core';
import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { WorkDetailsComponent } from '../../../../shared/components/work-details/work-details.component';

@Component({
  selector: 'app-preliminary-draft-details-page',
  templateUrl: './preliminary-draft-details-page.component.html',
  styleUrls: ['./preliminary-draft-details-page.component.css'],
  imports: [ButtonComponent, WorkDetailsComponent],
  providers: [PreliminaryDraftDetailsPageService]
})
export class PreliminaryDraftDetailsPageComponent implements OnInit {
  readonly pageService = inject(PreliminaryDraftDetailsPageService);

  ngOnInit(): void {
    this.pageService.init();
  }
}
