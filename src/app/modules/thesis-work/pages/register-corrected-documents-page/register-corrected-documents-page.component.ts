import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { RegisterCorrectedDocumentsFacadeService } from './services/register-corrected-documents-facade.service';
import { RegisterCorrectedDocumentFormComponent } from '../../components/register-corrected-document-form/register-corrected-document-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-register-corrected-documents-page',
  templateUrl: './register-corrected-documents-page.component.html',
  styleUrls: ['./register-corrected-documents-page.component.css'],
  imports: [RegisterCorrectedDocumentFormComponent, ConfirmationActionModalComponent]
})
export class RegisterCorrectedDocumentsPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(RegisterCorrectedDocumentsFacadeService);

  readonly thesisWorkState    = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSubmitting       = signal(false);
  // ← Fix: annexes ya no es opcional — el formulario garantiza ambos archivos
  readonly pendingFilesData   = signal<{ monograph: File; annexes: File } | null>(null);

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

  handleRequestConfirmation(files: { monograph: File; annexes: File }): void {
    this.pendingFilesData.set(files);
    this.isConfirmModalOpen.set(true);
  }

  processCorrectedDocuments(): void {
    const files    = this.pendingFilesData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!files || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processCorrectedDocuments(
      thesisId, files,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }
}
