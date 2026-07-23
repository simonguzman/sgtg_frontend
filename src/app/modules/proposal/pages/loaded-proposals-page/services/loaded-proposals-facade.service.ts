import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { DocumentTableRow } from '../models/loaded-proposals-page.model';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { Proposal } from '../../../interfaces/proposal.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';

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
    return proposal.documents.map(document =>
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

  public handleDownload(document: DocumentTableRow): void {
    if (!document.url?.trim()) {
      this.showNotification('Archivo no disponible', 'Ruta no válida.', NotificationType.ERROR);
      return;
    }
    this.showNotification('Descarga iniciada', 'El documento se está descargando.', NotificationType.INFO);
    this.downloadService.download(document.url, `${document.name}.pdf`);
  }

  public upload(
    proposalId: string,
    fileData: { fileName: string; file: File },
    onSuccess: () => void,
    onError:   () => void
  ): void {
    this.showNotification('Subiendo documento', 'Estamos procesando la corrección...', NotificationType.INFO);

    const newDoc: FileDocument = {
      id: crypto.randomUUID(),
      name: fileData.fileName.replace('.pdf', ''),
      url: '',
      uploadDate: this.formatDate(new Date()),
      type: DocumentType.CORRECCION,
      status: stateList.EN_REVISION
    };

    this.proposalService.uploadCorrectionMock(proposalId, newDoc)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('¡Documento cargado!', 'Enviado a revisión exitosamente.', NotificationType.CONFIRMATION);
          onSuccess();
        },
        error: () => {
          this.showNotification('Error de carga', 'No se pudo subir el archivo.', NotificationType.ERROR);
          onError();
        }
      });
  }

  public findProposal(proposalId: string | null): Proposal | undefined {
    if (!proposalId) return undefined;
    return this.proposalService.allProposals().find(proposal => proposal.id === proposalId);
  }

  private formatDate(date: Date): string {
    return date
      .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, ' - ');
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
