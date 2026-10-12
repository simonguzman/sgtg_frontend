import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { versionesDePropuesta } from '../../../services/proposal-rules.service';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Proposal } from '../../../interfaces/proposal.interface';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';

@Injectable({ providedIn: 'root' })
export class LoadedProposalsFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly mapper = inject(LoadedProposalsMapperService);

  public buildDocumentsTableData(proposalId: string | null): DocumentTableRow[] {
    const proposal = this.findProposal(proposalId);
    const user = this.authService.currentUser();
    if (!proposal || !user) return [];

    const canEvaluate = this.authService.hasAnyRole([UserRoleType.COMITE, UserRoleType.ADMINISTRADOR]);
    // Versiones del formato A de la más reciente a la más antigua; después, los demás documentos (carta)
    const versiones = versionesDePropuesta(proposal).reverse();
    const otros = proposal.documents.filter(document => !versiones.includes(document));
    return [...versiones, ...otros].map(document =>
      this.mapper.mapDocumentToRow(document, canEvaluate, !!proposal.isArchived)
    );
  }

  public buildHeaderButtons(proposalId: string | null): TableButton[] {
    const proposal = this.findProposal(proposalId);
    const user = this.authService.currentUser();
    if (!proposal || !user || proposal.isArchived) return [];

    const isDirector = proposal.director.id === user.id;
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    if (!isDirector && !isAdmin) return [];

    const documents = this.buildDocumentsTableData(proposalId);
    const hasDocInReview = documents.some(document => document.status === stateList.EN_REVISION);
    const isFullyApproved = proposal.state === stateList.APROBADO;

    return [{
      action: 'upload_correction',
      label: 'Cargar propuesta corregida',
      variant: 'primary',
      disabled: hasDocInReview || isFullyApproved
    }];
  }

  public canUpload(proposalId: string | null): boolean {
    const proposal = this.findProposal(proposalId);
    const user = this.authService.currentUser();
    const isDirector = proposal?.director.id === user?.id;
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);

    if (!isDirector && !isAdmin) {
      this.showNotification('Acceso denegado', 'No tienes permisos de carga.', NotificationType.ERROR);
      return false;
    }
    return true;
  }

  public async handleDownload(document: DocumentTableRow): Promise<void> {
    if (!document.url?.trim()) {
      this.showNotification('Archivo no disponible', 'Ruta no válida.', NotificationType.ERROR);
      return;
    }

    this.showNotification('Descarga iniciada', 'El documento se está descargando.', NotificationType.INFO);

    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  public showRestrictedActionNotification(): void {
    this.showNotification(
      'Acción no permitida',
      'Su usuario no posee los privilegios necesarios para ejecutar esta acción.',
      NotificationType.ERROR
    );
  }

  public async upload(
    proposalId: string,
    fileData: { fileName: string; file: File },
    onSuccess: () => void,
    onError:   () => void
  ): Promise<void> {
    this.showNotification('Subiendo documento', 'Estamos procesando la corrección...', NotificationType.INFO);

    this.proposalService.uploadCorrection(proposalId, fileData.file)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('¡Documento cargado!', 'Enviado a revisión exitosamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: (err) => {
          this.showNotification('Error de carga', apiErrorMessage(err, 'No se pudo subir el archivo.'), NotificationType.ERROR);
          onError();
        }
      });
  }

  public findProposal(proposalId: string | null): Proposal | undefined {
    if (!proposalId) return undefined;
    return this.proposalService.allProposals().find(proposal => proposal.id === proposalId);
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
