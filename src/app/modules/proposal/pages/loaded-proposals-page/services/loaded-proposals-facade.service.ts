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
import { formatDisplayDate } from '../../../../../core/utils/date-utils';
import { readFileAsDataUrl } from '../../../../../core/utils/file-reader.utils';

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
      // ← NUEVO: antes el botón no tenía `action`. Con un solo botón
      // posible funcionaba porque handleHeaderButton() ignoraba el
      // evento por completo — pero si algún día se agrega un segundo
      // botón de cabecera, ambos dispararían el mismo flujo de carga sin
      // distinción. Se agrega para que el handler pueda verificar cuál
      // botón fue el que se presionó (mismo patrón que
      // ThesisWorkPageComponent.handleHeaderButton).
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

  // ← FIX CENTRAL: el servicio ya se llamaba, pero de forma "fire and
  // forget" — sin await ni try/catch. FileDownloadService.download() es
  // async desde el refactor de hace unos turnos; este método no seguía
  // ese contrato. Mismo patrón que aplicamos en
  // DownloadableFormatsFacadeService.downloadFormat().
  public async handleDownload(document: DocumentTableRow): Promise<void> {
    if (!document.url?.trim()) {
      this.showNotification('Archivo no disponible', 'Ruta no válida.', NotificationType.ERROR);
      return;
    }

    this.showNotification('Descarga iniciada', 'El documento se está descargando.', NotificationType.INFO);

    try {
      await this.downloadService.download(document.url, `${document.name}.pdf`);
    } catch (err) {
      // Con la implementación actual de FileDownloadService, este catch
      // es efectivamente inalcanzable (el servicio ya maneja y notifica
      // sus propios errores internamente sin relanzarlos) — se conserva
      // como salvaguarda ante un cambio futuro en ese contrato, no porque
      // hoy se espere que se ejecute.
      console.error(`Error al descargar el documento ${document.name}:`, err);
      this.showNotification('Error de descarga', `No se pudo descargar ${document.name}. Intente más tarde.`, NotificationType.ERROR);
    }
  }

  // ← NUEVO: antes, si la acción no estaba permitida, handleTableAction
  // simplemente retornaba en silencio, sin avisar al usuario. Todas las
  // demás páginas con tabla del proyecto (ThesisWork, History,
  // CorrectedDocuments...) notifican con este mismo método.
  public showRestrictedActionNotification(): void {
    this.showNotification(
      'Acción no permitida',
      'Su usuario no posee los privilegios necesarios para ejecutar esta acción.',
      NotificationType.ERROR
    );
  }

  // ← upload() pasa de void a async: necesita esperar la lectura del
  // archivo (FileReader es asíncrono) antes de poder construir el
  // FileDocument con su url ya resuelta.
  public async upload(
    proposalId: string,
    fileData: { fileName: string; file: File },
    onSuccess: () => void,
    onError:   () => void
  ): Promise<void> {
    this.showNotification('Subiendo documento', 'Estamos procesando la corrección...', NotificationType.INFO);

    let fileUrl: string;
    try {
      fileUrl = await readFileAsDataUrl(fileData.file);
    } catch (err) {
      console.error('Error leyendo el archivo seleccionado:', err);
      this.showNotification('Error de carga', 'No se pudo leer el archivo seleccionado.', NotificationType.ERROR);
      onError();
      return;
    }

    const newDoc: FileDocument = {
      id: crypto.randomUUID(),
      name: fileData.fileName.replace('.pdf', ''),
      // ← FIX definitivo: Data URL (base64) en vez de Blob URL. El string
      // resultante contiene el archivo completo — sobrevive un refresh de
      // página y la serialización a JSON.stringify/localStorage sin
      // depender de ninguna referencia en memoria que el navegador pueda
      // invalidar. Trade-off consciente: el string ocupa ~33% más que el
      // tamaño real del PDF (overhead de base64), y localStorage tiene un
      // límite típico de 5-10MB por origen — para PDFs de corrección de
      // propuesta (documentos de texto, normalmente unos cientos de KB)
      // esto no debería ser un problema práctico en un prototipo, pero si
      // en algún momento se suben archivos grandes de forma recurrente,
      // este límite sí se puede alcanzar.
      url: fileUrl,
      uploadDate: formatDisplayDate(new Date()),
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

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}
