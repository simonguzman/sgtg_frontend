import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { RegisterCorrespondenceFacadeService } from './services/register-correspondence-facade.service';
import { RegisterCorrespondenceFormComponent } from '../../components/register-correspondence-form/register-correspondence-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({
  selector: 'app-register-correspondence-page',
  templateUrl: './register-correspondence-page.component.html',
  styleUrls: ['./register-correspondence-page.component.css'],
  imports: [RegisterCorrespondenceFormComponent, ConfirmationActionModalComponent]
})
export class RegisterCorrespondencePageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(RegisterCorrespondenceFacadeService);

  readonly thesisWorkDetails  = signal<ThesisWork | null>(null);
  readonly isSubmitting       = signal<boolean>(false);
  readonly isConfirmModalOpen = signal<boolean>(false);
  readonly pendingFile        = signal<File | null>(null);

  ngOnInit(): void {
    const thesisWorkId = this.route.snapshot.paramMap.get('id') ?? this.route.parent?.snapshot.paramMap.get('id');
    if (!thesisWorkId) {
      this.facade.showNavigationError();
      this.goBack();
      return;
    }

    this.facade.loadThesisWork(
      thesisWorkId,
      (work) => this.thesisWorkDetails.set(work),
      () => this.goBack()
    );
  }

  handleRequestConfirmation(file: File): void {
    this.pendingFile.set(file);
    this.isConfirmModalOpen.set(true);
  }

  processCorrespondence(): void {
    const file        = this.pendingFile();
    const currentWork = this.thesisWorkDetails();

    if (!file || !currentWork) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processCorrespondence(
      currentWork.thesisWorkId,
      file,
      () => {
        this.isSubmitting.set(false);
        this.goBack();
      },
      () => {
        this.isSubmitting.set(false);
      }
    );
  }

  goBack(): void {
    // Angular maneja router.navigate como Promise. Usamos void explícito por buenas prácticas.
    void this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
