import { Component, EventEmitter, inject, Input, Output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { RegisterSpecialRequestFormService } from './services/register-special-request-form.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';

@Component({
  selector: 'app-register-special-request-form',
  templateUrl: './register-special-request-form.component.html',
  styleUrls: ['./register-special-request-form.component.css'],
  imports: [ReactiveFormsModule, ButtonComponent, InfoBannerComponent],
  providers: [RegisterSpecialRequestFormService]
})
export class RegisterSpecialRequestFormComponent {
  protected readonly formService = inject(RegisterSpecialRequestFormService);

  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveRequest = new EventEmitter<{ requestType: SpecialRequestType; comments: string }>();

  readonly isSubmitAttempted = signal(false);

  // ← Getters que exponen el servicio al template sin cambiar los nombres
  // que el HTML ya usa (requestForm, requestOptions).
  get requestForm()    { return this.formService.form; }
  get requestOptions() { return this.formService.requestOptions; }

  getStudentNames(): string   { return this.formService.getStudentNames(this.thesisWork); }
  getDirectorName(): string   { return this.formService.getDirectorName(this.thesisWork); }
  getCodirectorName(): string { return this.formService.getCodirectorName(this.thesisWork); }
  getAdvisorName(): string    { return this.formService.getAdvisorName(this.thesisWork); }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.requestForm.get(fieldName);
    return !!(this.isSubmitAttempted() && control?.invalid) || !!(control?.invalid && control?.touched);
  }

  submit(): void {
    this.isSubmitAttempted.set(true);
    this.requestForm.markAllAsTouched();

    if (this.requestForm.invalid) {
      this.formService.notifyIncompleteForm();
      return;
    }

    // ← Fix: sin cast. TypeScript estrecha `requestType` de `SpecialRequestType | ''`
    // a `SpecialRequestType` tras descartar la rama falsy ('').
    const raw = this.requestForm.getRawValue();
    if (!raw.requestType) return;

    this.onSaveRequest.emit({ requestType: raw.requestType, comments: raw.comments });
  }
}
