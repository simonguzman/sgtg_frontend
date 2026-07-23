import { Component, inject, OnInit } from '@angular/core';

import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";

@Component({
  selector: 'app-preliminary-draft-details-page',
  templateUrl: './preliminary-draft-details-page.component.html',
  styleUrls: ['./preliminary-draft-details-page.component.css'],
  imports: [ButtonComponent],
  providers: [PreliminaryDraftDetailsPageService] // Proveemos el servicio aquí
})
export class PreliminaryDraftDetailsPageComponent implements OnInit {
  readonly pageService = inject(PreliminaryDraftDetailsPageService);

  ngOnInit(): void {
    this.pageService.init();
  }
}
