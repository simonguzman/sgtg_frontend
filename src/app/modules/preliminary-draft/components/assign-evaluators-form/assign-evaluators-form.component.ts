import { Component, effect, inject, input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { AssignEvaluatorsFormFacadeService } from './services/assign-evaluators-form-facade.service';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-assign-evaluators-form',
  imports: [ReactiveFormsModule, ButtonComponent, NgTemplateOutlet, DatePipe, InfoBannerComponent, SearchableSelectComponent],
  providers: [DatePipe, AssignEvaluatorsFormFacadeService], // Proveemos la Facade localmente
  templateUrl: './assign-evaluators-form.component.html',
  styleUrls: ['./assign-evaluators-form.component.css']
})
export class AssignEvaluatorsFormComponent {
  readonly facade = inject(AssignEvaluatorsFormFacadeService);

  preliminaryDraft = input.required<PreliminaryDraft>();
  @Output() onSave = new EventEmitter<{ ev1: string, ev2: string }>();

  constructor() {
    // Sincronizamos el input con el signal del Facade
    effect(() => {
      this.facade.preliminaryDraft.set(this.preliminaryDraft());
    }, { allowSignalWrites: true });
  }

  submit(): void {
    const payload = this.facade.validateAndGetPayload();
    if (payload) {
      this.onSave.emit(payload);
    }
  }
}
