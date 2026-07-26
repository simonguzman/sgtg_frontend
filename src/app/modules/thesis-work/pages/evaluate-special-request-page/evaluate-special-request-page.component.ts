import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { EvaluateSpecialRequestFacadeService } from './services/evaluate-special-request-facade.service';
import { EvaluateSpecialRequestFormComponent } from '../../components/evaluate-special-request-form/evaluate-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

@Component({
  selector: 'app-evaluate-special-request-page',
  templateUrl: './evaluate-special-request-page.component.html',
  styleUrls: ['./evaluate-special-request-page.component.css'],
  imports: [EvaluateSpecialRequestFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateSpecialRequestPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(EvaluateSpecialRequestFacadeService);

  readonly thesisWorkState     = signal<ThesisWork | null>(null);
  readonly specialRequestState = signal<SpecialRequest | null>(null);
  readonly isConfirmModalOpen  = signal(false);
  readonly isSubmitting        = signal(false);
  // ← Fix: any → tipo concreto alineado con evaluateSpecialRequestMock
  readonly pendingData = signal<{ status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date } | null>(null);

  ngOnInit(): void {
    const requestId = this.route.snapshot.paramMap.get('requestId');
    let thesisId    = this.route.snapshot.paramMap.get('id');
    let currentRoute = this.route.parent;
    while (!thesisId && currentRoute) {
      thesisId = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!thesisId || !requestId) {
      console.warn('Faltan parámetros en la URL:', { thesisId, requestId });
      this.goBack();
      return;
    }

    this.facade.loadThesisWorkAndRequest(
      thesisId, requestId,
      (work, request) => {
        this.thesisWorkState.set(work);
        this.specialRequestState.set(request);
      },
      () => this.goBack()
    );
  }

  handleSaveTriggered(data: { status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSpecialRequestEvaluation(): void {
    const data     = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    const reqId    = this.specialRequestState()?.id;
    if (!data || !thesisId || !reqId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processEvaluation(
      thesisId, reqId, data,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
