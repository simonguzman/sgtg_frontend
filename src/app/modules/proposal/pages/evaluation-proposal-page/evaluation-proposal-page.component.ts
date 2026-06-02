import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ProposalService } from '../../services/proposal.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { UserService } from '../../../users/services/user.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { Proposal } from '../../interfaces/proposal.interface';
import { Evaluation } from '../../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { EvaluationProposalFormComponent } from '../../components/evaluation-proposal-form/evaluation-proposal-form.component';


const RESULT_TO_STATE: Record<string, stateList> = {
  'Aprobado':                    stateList.APROBADO,
  'No aprobado':                 stateList.NO_APROBADO
};

@Component({
  selector: 'app-evaluation-proposal-page',
  standalone: true,
  imports: [EvaluationProposalFormComponent],
  templateUrl: './evaluation-proposal-page.component.html',
})
export class EvaluationProposalPageComponent implements OnInit {
  private readonly route               = inject(ActivatedRoute);
  private readonly router              = inject(Router);
  private readonly location            = inject(Location);
  private readonly proposalService     = inject(ProposalService);
  private readonly downloadService     = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService         = inject(UserService);
  private readonly authService         = inject(AuthService);

  proposal = signal<Proposal | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id')
            ?? this.route.parent?.snapshot.paramMap.get('id');

    if (!id) { this.goBack(); return; }

    this.proposalService.getProposalByIdMock(id).subscribe({
      next:  (data) => data ? this.proposal.set(data) : this.goBack(),
      error: ()     => this.goBack()
    });
  }

  downloadOriginalDocument(): void {
    const doc = this.proposal()?.documents?.[0] ?? null;
    if (!doc?.url?.trim()) {
      this.showDownloadErrorNotification();
      return;
    }
    this.showDownloadStartedNotification();
    this.downloadService.download(doc.url, doc.name);
  }

  handleSaveEvaluation(event: { result: string; comments: string; signedFileName: string }): void {
    const currentProposal = this.proposal();
    const currentUser = this.authService.currentUser();

    const docs = currentProposal?.documents || [];
    const targetDocument = docs.filter(doc =>
      doc.type === 'Propuesta' || doc.type === 'Correccion'
    ).sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime())[0];

    if (!currentProposal?.id || !currentUser || !targetDocument) {
      this.showUpdateErrorNotification();
      return;
    }

    const newState = RESULT_TO_STATE[event.result] ?? currentProposal.state;

    const newEvaluation: Evaluation = {
      id: crypto.randomUUID(),
      proposalId: currentProposal.id,
      documentId: targetDocument.id,
      evaluatorId: currentUser.id,
      evaluatorName: this.userService.getUserFullName(currentUser.id),
      evaluatorRole: currentUser.roles[0] ?? 'Evaluador',
      signedDocuments: [event.signedFileName],
      veredict: newState,
      observations: event.comments,
      date: new Date()
    };

    this.proposalService.addEvaluationMock(currentProposal.id, newEvaluation).subscribe({
      next: () => {
        this.showEvaluationSuccessNotification();
        this.router.navigate(['../../'], { relativeTo: this.route });
      },
      error: () => this.showUpdateErrorNotification()
    });
  }

  goBack(): void {
    this.location.back();
  }

  // --- Notificaciones del Servidor ---
  private showDownloadStartedNotification() {
    this.notificationService.show({
      title: 'Descarga iniciada',
      message: 'Descargando la propuesta original para su revisión...',
      type: NotificationType.INFO
    });
  }

  private showDownloadErrorNotification() {
    this.notificationService.show({
      title: 'Error de descarga',
      message: 'No se pudo obtener el documento original. Contacte a soporte técnico.',
      type: NotificationType.ERROR
    });
  }

  private showEvaluationSuccessNotification() {
    this.notificationService.show({
      title: 'Evaluación registrada',
      message: 'La decisión del comité ha sido guardada y el estado de la propuesta actualizado.',
      type: NotificationType.CONFIRMATION
    });
  }

  private showUpdateErrorNotification() {
    this.notificationService.show({
      title: 'Error de servidor',
      message: 'Hubo un problema al guardar la evaluación. Intente nuevamente en unos minutos.',
      type: NotificationType.ERROR
    });
  }
}
