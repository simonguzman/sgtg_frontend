import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { RegisterSustentationFacadeService } from './services/register-sustentation-facade.service';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterSustentationFormComponent, SustentationFormPayload } from '../../components/register-sustentation-form/register-sustentation-form.component';

@Component({
  selector: 'app-register-sustentation-page',
  templateUrl: './register-sustentation-page.component.html',
  styleUrls: ['./register-sustentation-page.component.css'],
  imports: [ConfirmationActionModalComponent, RegisterSustentationFormComponent]
})
export class RegisterSustentationPageComponent implements OnInit {
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly facade = inject(RegisterSustentationFacadeService);

  // ← teachersState y la inyección de UserService fueron eliminados: nunca se
  // usaban en el template ni se pasaban al formulario — era código muerto.
  readonly thesisWorkState    = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal<boolean>(false);
  readonly isSubmitting       = signal<boolean>(false);
  readonly pendingData        = signal<{ payload: SustentationFormPayload; file: File } | null>(null);

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

  handleRequestConfirmation(data: { payload: SustentationFormPayload; file: File }): void {
    this.pendingData.set(data);
    this.isConfirmModalOpen.set(true);
  }

  processSustentacion(): void {
    const data     = this.pendingData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!data || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processSustentation(
      thesisId, data.payload, data.file,
      () => { this.isSubmitting.set(false); this.goBack(); },
      () => { this.isSubmitting.set(false); }
    );
  }

  goBack(): void {
    this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent });
  }
}
