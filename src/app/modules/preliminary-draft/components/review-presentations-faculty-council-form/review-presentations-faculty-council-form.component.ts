import { Component, effect, inject, input, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';

import { ReviewPresentationsFacultyCouncilFormFacadeService } from './services/review-presentations-faculty-council-form-facade.service';

import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { SaveEvaluationPayload } from './models/council-evaluation.model';

@Component({
  selector: 'app-review-presentations-faculty-council-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonComponent,
    FileUploadModalComponent,
    InfoBannerComponent,
    DatePicker
  ],
  providers: [ReviewPresentationsFacultyCouncilFormFacadeService],
  templateUrl: './review-presentations-faculty-council-form.component.html',
  styleUrls: ['./review-presentations-faculty-council-form.component.css']
})
export class ReviewPresentationsFacultyCouncilFormComponent implements OnInit {
  readonly facade = inject(ReviewPresentationsFacultyCouncilFormFacadeService);

  preliminaryDraft = input.required<PreliminaryDraft>();
  isSubmitting = input<boolean>(false);

  onSaveEvaluation = output<SaveEvaluationPayload>();
  onDownloadFile = output<FileDocument>();

  constructor() {
    // Sincronizamos el input con el signal interno de la fachada
    effect(() => {
      this.facade.preliminaryDraft.set(this.preliminaryDraft());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    this.facade.initFormEffects();
  }

  submit(): void {
    const payload = this.facade.validateAndGetPayload();
    if (payload) {
      this.onSaveEvaluation.emit(payload);
    }
  }
}
