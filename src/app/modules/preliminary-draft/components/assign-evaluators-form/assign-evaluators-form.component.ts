import { Component, effect, inject, input, Output, EventEmitter } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { AssignEvaluatorsFormFacadeService } from './services/assign-evaluators-form-facade.service';
import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';
import { ReadonlyFieldComponent } from '../../../../shared/components/readonly-field/readonly-field.component';

@Component({
  selector: 'app-assign-evaluators-form',
  imports: [ReactiveFormsModule, ButtonComponent, DatePipe, InfoBannerComponent, SearchableSelectComponent, ReadonlyFieldComponent],
  providers: [DatePipe, AssignEvaluatorsFormFacadeService],
  templateUrl: './assign-evaluators-form.component.html',
  styleUrls: ['./assign-evaluators-form.component.css']
})
export class AssignEvaluatorsFormComponent {
  readonly facade = inject(AssignEvaluatorsFormFacadeService);

  preliminaryDraft = input.required<PreliminaryDraft>();
  @Output() onSave = new EventEmitter<{ ev1: string, ev2: string }>();

  constructor() {
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
