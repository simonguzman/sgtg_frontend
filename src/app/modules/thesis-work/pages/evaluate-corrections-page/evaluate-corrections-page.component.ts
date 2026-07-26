import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { EvaluateCorrectionsFacadeService } from './services/evaluate-corrections-facade.service';
import { EvaluateCorrectionsFormComponent } from '../../components/evaluate-corrections-form/evaluate-corrections-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-evaluate-corrections-page',
  templateUrl: './evaluate-corrections-page.component.html',
  styleUrls: ['./evaluate-corrections-page.component.css'],
  standalone: true,
  imports: [EvaluateCorrectionsFormComponent, ConfirmationActionModalComponent]
})
export class EvaluateCorrectionsPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(EvaluateCorrectionsFacadeService);

  readonly thesisWorkState       = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen    = signal(false);
  readonly isSubmitting          = signal(false);
  readonly pendingEvaluationData = signal<{ evaluation: Omit<Evaluation, 'id' | 'date'>; file: File } | null>(null);

  ngOnInit(): void {
    let currentRoute: ActivatedRoute | null = this.route;
    let id: string | null = null;
    while (currentRoute && !id) {
      id = currentRoute.snapshot.paramMap.get('id');
      currentRoute = currentRoute.parent;
    }

    if (!id) {
      this.facade.showNavigationError();
      this.goBack();
      return;
    }
    this.facade.loadThesisWork(id, (work) => this.thesisWorkState.set(work), () => this.goBack());
  }

  handleOpenConfirmation(event: { evaluation: Omit<Evaluation, 'id' | 'date'>; file: File }): void {
    this.pendingEvaluationData.set(event);
    this.isConfirmModalOpen.set(true);
  }

  executeEvaluationSave(): void {
    const data     = this.pendingEvaluationData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.saveEvaluation(
      thesisId, data.evaluation, data.file,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
