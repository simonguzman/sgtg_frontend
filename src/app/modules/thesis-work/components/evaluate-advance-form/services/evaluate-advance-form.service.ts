import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ThesisParticipantsFormatterService } from '../../../services/thesis-participants-formatter.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { AdvanceEvaluationResult } from '../../../interfaces/advance-playload.interface';

@Injectable()
export class EvaluateAdvanceFormService {
  private readonly fb = inject(FormBuilder);
  private readonly participants = inject(ThesisParticipantsFormatterService);

  readonly evaluationForm = this.fb.nonNullable.group({
    result:   [AdvanceEvaluationResult.EN_REVISION, Validators.required],
    comments: ['', Validators.required]
  });

  getStudentNames(thesisWork: ThesisWork): string { return this.participants.getStudentNames(thesisWork); }
  getDirectorName(thesisWork: ThesisWork): string { return this.participants.getDirectorName(thesisWork); }
  getCodirectorName(thesisWork: ThesisWork): string { return this.participants.getCodirectorName(thesisWork); }
  getAdvisorName(thesisWork: ThesisWork): string { return this.participants.getAdvisorName(thesisWork); }
}
