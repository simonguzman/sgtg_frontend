import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationRequestFiles } from '../../services/thesis-work-sustentation.service';
import { UploadFinalDeliveryFacadeService } from './services/upload-final-delivery-facade.service';
import { UploadFinalDeliveryFormComponent } from '../../components/upload-final-delivery-form/upload-final-delivery-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { NavigationHistoryService } from '../../../../core/services/navigation/navigation-history.service';

@Component({
  selector: 'app-upload-final-delivery-page',
  imports: [UploadFinalDeliveryFormComponent, ConfirmationActionModalComponent],
  templateUrl: './upload-final-delivery-page.component.html',
  styleUrls: ['./upload-final-delivery-page.component.css']
})
export class UploadFinalDeliveryPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigation = inject(NavigationHistoryService);
  protected readonly facade = inject(UploadFinalDeliveryFacadeService);

  readonly thesisWorkState = signal<ThesisWork | null>(null);
  readonly isConfirmModalOpen = signal(false);
  readonly isSubmitting = signal(false);
  readonly pendingFilesData = signal<SustentationRequestFiles | null>(null);

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

    this.facade.loadThesisWork(
      id,
      (thesisWork) => this.thesisWorkState.set(thesisWork),
      () => this.goBack()
    );
  }

  handleRequestConfirmation(files: SustentationRequestFiles): void {
    this.pendingFilesData.set(files);
    this.isConfirmModalOpen.set(true);
  }

  processFinalDelivery(): void {
    const files = this.pendingFilesData();
    const thesisId = this.thesisWorkState()?.thesisWorkId;
    if (!files || !thesisId) return;

    this.isSubmitting.set(true);
    this.isConfirmModalOpen.set(false);

    this.facade.processFinalDelivery(
      thesisId,
      files,
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
    this.navigation.back(() => this.router.navigate(['loaded_documents'], { relativeTo: this.route.parent }));
  }
}
