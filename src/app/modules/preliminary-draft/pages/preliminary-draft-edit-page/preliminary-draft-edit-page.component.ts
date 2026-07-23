import { Component, inject, OnInit } from '@angular/core';

import { PreliminaryDraftEditPageService } from './services/preliminary-draft-edit-page.service';

import { PreliminaryDraftFormComponent } from "../../components/preliminary-draft-form/preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { InfoBannerComponent } from "../../../../shared/components/info-banner/info-banner.component";

@Component({
  selector: 'app-preliminary-draft-edit-page',
  templateUrl: './preliminary-draft-edit-page.component.html',
  styleUrls: ['./preliminary-draft-edit-page.component.css'],
  imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent, InfoBannerComponent],
  providers: [PreliminaryDraftEditPageService] // Proveemos el servicio orquestador
})
export class PreliminaryDraftEditPageComponent implements OnInit {
  readonly pageService = inject(PreliminaryDraftEditPageService);

  ngOnInit(): void {
    this.pageService.init();
  }
}
