import { Component, inject, OnInit } from '@angular/core';

import { AssignEvaluatorsPageFacadeService } from './services/assign-evaluators-page-facade.service';

import { AssignEvaluatorsFormComponent } from "../../components/assign-evaluators-form/assign-evaluators-form.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";

@Component({
  selector: 'app-assing-evaluators-page',
  templateUrl: './assign-evaluators-page.component.html',
  styleUrls: ['./assign-evaluators-page.component.css'],
  imports: [AssignEvaluatorsFormComponent, ConfirmationActionModalComponent],
  providers: [AssignEvaluatorsPageFacadeService] // Proveemos la Facade localmente
})
export class AssignEvaluatorsPageComponent implements OnInit {
  readonly facade = inject(AssignEvaluatorsPageFacadeService);

  ngOnInit(): void {
    this.facade.init();
  }
}
