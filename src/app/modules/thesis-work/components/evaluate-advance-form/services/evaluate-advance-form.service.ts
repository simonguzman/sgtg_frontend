import { inject, Injectable } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { UserService } from '../../../../users/services/user.service';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { AdvanceEvaluationResult } from '../../../interfaces/advance-playload.interface';

// Scoped al componente — mismo patrón que UploadAdvanceFormService.
// La separación entre ambos servicios de formulario está justificada porque
// tienen estructuras de formulario distintas y diferentes reglas de validación.
@Injectable()
export class EvaluateAdvanceFormService {
  private readonly fb          = inject(FormBuilder);
  private readonly userService = inject(UserService);

  readonly evaluationForm = this.fb.nonNullable.group({
    result:   [AdvanceEvaluationResult.EN_REVISION, Validators.required],
    comments: ['', Validators.required]
  });


  // ── Formateo de participantes ─────────────────────────────────────────────
  // Misma interfaz que UploadAdvanceFormService para no crear acoplamiento
  // entre los dos formularios pero manteniendo las firmas consistentes.

  getStudentNames(thesisWork: ThesisWork): string {
    return this.userService.getAuthorsNames(
      thesisWork?.preliminaryDraftData?.proposalData?.authors ?? []
    );
  }

  getMemberName(id: string | undefined): string {
    return id ? this.userService.getUserFullName(id) : '';
  }
}
