import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { EvaluateSustentationFacadeService } from './services/evaluate-sustentation-facade.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { EvaluateSustentationFormComponent, SustentationEvaluationPayload } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';

@Component({
  selector: 'app-evaluate-sustentation-page',
  templateUrl: './evaluate-sustentation-page.component.html',
  styleUrls: ['./evaluate-sustentation-page.component.css'],
  imports: [ConfirmationActionModalComponent, EvaluateSustentationFormComponent]
})
export class EvaluateSustentationPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(EvaluateSustentationFacadeService);

  readonly thesisWorkState    = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal<boolean>(false);
  readonly isSubmitting       = signal<boolean>(false);
  readonly pendingData        = signal<{ payload: SustentationEvaluationPayload; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }
    if (!id) { this.goBack(); return; }

    this.facade.loadThesisWork(
      id,
      (work) => this.thesisWorkState.set(work),
      ()     => this.goBack()
    );
  }

  handleSaveTriggered(data: { payload: SustentationEvaluationPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSustentationEvaluation(): void {
    const data     = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processEvaluation(
      thesisId, data.payload, data.file,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
