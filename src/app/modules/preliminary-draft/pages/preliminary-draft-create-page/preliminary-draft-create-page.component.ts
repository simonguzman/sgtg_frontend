import { Component, inject, OnInit } from '@angular/core';

import { PreliminaryDraftCreatePageService } from './services/preliminary-draft-create-page.service';

import { PreliminaryDraftFormComponent } from "../../components/preliminary-draft-form/preliminary-draft-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-preliminary-draft-create-page',
  templateUrl: './preliminary-draft-create-page.component.html',
  styleUrls: ['./preliminary-draft-create-page.component.css'],
  imports: [PreliminaryDraftFormComponent, ConfirmationActionModalComponent],
  providers: [PreliminaryDraftCreatePageService] // <-- Aquí proveemos el servicio localmente
})
export class PreliminaryDraftCreatePageComponent implements OnInit {
  readonly pageService = inject(PreliminaryDraftCreatePageService);

  ngOnInit(): void {
    this.pageService.checkAccess();
  }
}
