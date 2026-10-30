import { inject, Injectable } from '@angular/core';
import { first } from 'rxjs/operators';
import { ProposalService } from '../../../services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { FileDownloadService } from '../../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../../shared/components/notifications/services/notification.service';
import { NotificationType } from '../../../../../shared/components/notifications/models/notification.model';
import { LoadedProposalsMapperService } from './loaded-proposals-mapper.service';
import { versionesDePropuesta } from '../../../services/proposal-rules.service';
import { DocumentTableRow, ProposalRegistrationDetails } from '../models/loaded-proposals-page.model';
import { UserService } from '../../../../users/services/user.service';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { aFecha } from '../../../../../core/mappers/trabajo-grado.mapper';
import { parseDisplayDate } from '../../../../../core/utils/date-utils';
import { TableButton } from '../../../../../shared/components/table-component/table-component.component';
import { Proposal } from '../../../interfaces/proposal.interface';
import { Modality } from '../../../enums/modality.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { apiErrorMessage } from '../../../../../core/utils/api-error.utils';
import { RegisterDetailField } from '../../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { proposalContent } from '../../../../../shared/components/work-details/work-details.builder';

@Injectable({ providedIn: 'root' })
export class LoadedProposalsFacadeService {
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly mapper = inject(LoadedProposalsMapperService);
  private readonly userService = inject(UserService);

  /**
   * Un registro por versión del formato A, del más reciente al más antiguo. La
   * carta de aceptación de una práctica profesional va en el registro de la
   * versión con la que se radicó: la primera cargada desde la fecha de la
   * carta (o la última, si la carta es posterior a todas).
   */
  public buildDocumentsTableData(proposalId: string | null): DocumentTableRow[] {
    const proposal = this.findProposal(proposalId);
    const user = this.authService.currentUser();
    if (!proposal || !user) return [];

    const canEvaluate = this.authService.hasAnyRole([UserRoleType.COMITE, UserRoleType.ADMINISTRADOR]);
    const archived = !!proposal.isArchived;
    const versiones = versionesDePropuesta(proposal);
    const otros = proposal.documents.filter(document => !versiones.includes(document));
    if (versiones.length === 0) {
      return otros.length ? [this.mapper.mapRegistrationToRow(otros[0], otros.slice(1), false, canEvaluate, archived)] : [];
    }
    const adjuntosPorVersion = versiones.map((): FileDocument[] => []);
    otros.forEach(documento => {
      const fecha = fechaDeCarga(documento);
      const indice = versiones.findIndex(version => fechaDeCarga(version) >= fecha);
      adjuntosPorVersion[indice === -1 ? versiones.length - 1 : indice].push(documento);
    });
    return versiones
      .map((version, i) => this.mapper.mapRegistrationToRow(version, adjuntosPorVersion[i], true, canEvaluate, archived))
      .reverse();
  }

  /** Información de la propuesta y documentos de un registro, para el modal de detalles. */
  public buildRegistrationDetails(proposalId: string | null, row: DocumentTableRow | null): ProposalRegistrationDetails | null {
    const proposal = this.findProposal(proposalId);
    if (!proposal || !row) return null;
    return {
      subtitle: !row.version || row.version === 1
        ? 'Registro de la propuesta'
        : `Corrección de la propuesta – versión ${row.version}`,
      title: proposal.title,
      fields: this.describeProposal(proposal),
      modality: proposal.modality,
      student: this.userService.getAuthorsNames(proposal.authors),
      director: proposal.director ? this.userService.formatFullName(proposal.director) : 'No asignado',
      codirector: proposal.codirector ? this.userService.formatFullName(proposal.codirector) : undefined,
      adviser: proposal.advisor ? this.userService.formatFullName(proposal.advisor) : undefined,
      chargeDate: parseDisplayDate(row.documents[0]?.uploadDate),
      state: row.status,
      documents: row.documents
    };
  }

  /** Descarga un documento del registro por el nombre con que lo muestra el modal. */
  public async downloadRegistrationDocument(fileName: string, row: DocumentTableRow | null): Promise<void> {
    const document = row?.documents.find(doc => doc.name === fileName);
    if (!document) {
      this.showNotification('Archivo no disponible', 'No se encontró el documento seleccionado.', NotificationType.ERROR);
      return;
    }
    await this.handleDownload(document);
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
    const isFullyApproved = proposal.state === stateList.PERTINENTE;

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

  public async handleDownload(document: Pick<FileDocument, 'url' | 'name'>): Promise<void> {
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

  /** En práctica profesional la propuesta corregida se carga con una nueva carta de aceptación */
  public requiresAcceptanceLetter(proposalId: string | null): boolean {
    return this.findProposal(proposalId)?.modality === Modality.PP;
  }

  public showAcceptanceLetterRequiredNotification(): void {
    this.showNotification(
      'Carta de aceptación requerida',
      'En práctica profesional, la propuesta corregida se carga junto con la nueva carta de aceptación de la organización.',
      NotificationType.INFO
    );
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
    onError:   () => void,
    acceptanceLetter: File | null = null
  ): Promise<void> {
    this.showNotification('Subiendo documento', 'Estamos procesando la corrección...', NotificationType.INFO);

    this.proposalService.uploadCorrection(proposalId, fileData.file, acceptanceLetter)
      .pipe(first())
      .subscribe({
        next: () => {
          this.showNotification('¡Documento cargado!', acceptanceLetter
            ? 'La propuesta corregida y la nueva carta de aceptación se enviaron a revisión.'
            : 'Enviado a revisión exitosamente.', NotificationType.CONFIRMATION);
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

  /** Objetivos, descripción, línea de investigación y organización de la propuesta (solo los registrados). */
  private describeProposal(proposal: Proposal): RegisterDetailField[] {
    const content = proposalContent(proposal);
    const campos: RegisterDetailField[] = [];
    if (content.generalObjective) campos.push({ label: 'Objetivo general', value: content.generalObjective });
    if (content.specificObjectives.length) campos.push({ label: 'Objetivos específicos', values: content.specificObjectives });
    if (content.description) campos.push({ label: 'Descripción', value: content.description });
    if (content.lineOfResearch) campos.push({ label: 'Línea de investigación', value: content.lineOfResearch });
    if (content.organization) campos.push({ label: 'Organización', value: content.organization });
    return campos;
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }
}

/** Fecha de carga de un documento en milisegundos (0 si no tiene una válida). */
function fechaDeCarga(documento: FileDocument): number {
  const fecha = documento.uploadDate instanceof Date ? documento.uploadDate : aFecha(documento.uploadDate);
  return fecha?.getTime() ?? 0;
}
