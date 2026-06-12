import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { TabConfiguration, ThesisEvaluationContext } from './tabs-logic/tab-config.interface';
import { AdvancesTabConfig } from './tabs-logic/advaces.tab';
import { UserRoleType } from '../../../../core/models/user-role';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { TabItem, TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { Document } from '../../../../core/interfaces/Document.interface';
import { FileUploadModalComponent } from "../../../../shared/components/modals/file-upload-modal/file-upload-modal.component";
import { ConfirmationActionModalComponent } from "../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component";
import { stateList } from '../../../../core/enums/state.enum';
import { FinalDeliveryTabConfig } from './tabs-logic/final-delivery.tab';
import { PazYSalvoTabConfig } from './tabs-logic/paz_y_salvo.tab';
import { SustentationTabConfig } from './tabs-logic/sustentation.tab';
import { CorrespondenceTabConfig } from './tabs-logic/correspondence.tab';
import { SpecialRequestTabConfig } from './tabs-logic/special-request.tab';
import { RegisterInformationModalComponent } from "../../../../shared/components/modals/register-information-modal/register-information-modal.component";
import { UserService } from '../../../users/services/user.service';
import { Advance, SpecialRequest } from '../../interfaces/thesis-work.interface';  // ← NUEVO: SpecialRequest
import { User } from '../../../users/interfaces/user.interface';

@Component({
  selector: 'app-loaded-documents-thesis-work-page',
  templateUrl: './loaded-documents-thesis-work-page.component.html',
  styleUrls: ['./loaded-documents-thesis-work-page.component.css'],
  imports: [FileUploadModalComponent, ConfirmationActionModalComponent, TableComponent, TabsComponent, RegisterInformationModalComponent]
})
export class LoadedDocumentsThesisWorkPageComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly breadcrumbService = inject(BreadcrumbService);
  private readonly titleService = inject(Title);

  readonly tabsConfig: TabItem[] = [
    { label: 'Avances', value: 'AVANCES' },
    { label: 'Entrega final', value: 'ENTREGA FINAL' },
    { label: 'Paz y salvo', value: 'PAZ Y SALVO' },
    { label: 'Sustentación', value: 'SUSTENTACION' },
    { label: 'Correspondencia', value: 'CORRESPONDENCIA' },
    { label: 'Solicitudes especiales', value: 'SOLICITUDES' },
  ];

  private readonly tabStrategies: Record<string, TabConfiguration> = {
    'AVANCES': AdvancesTabConfig,
    'ENTREGA FINAL': FinalDeliveryTabConfig,
    'PAZ Y SALVO': PazYSalvoTabConfig,
    'SUSTENTACION': SustentationTabConfig,
    'CORRESPONDENCIA': CorrespondenceTabConfig,
    'SOLICITUDES': SpecialRequestTabConfig
  };

  activeTab = signal<string>('AVANCES');
  thesisWorkId = signal<string | null>(null);

  isUploadModalOpen = signal(false);
  isConfirmModalOpen = signal(false);
  uploadContext = signal<{ fileName: string, file: File } | null>(null);
  isDetailsModalOpen = signal(false);
  selectedAdvance = signal<Advance | null>(null);

  readonly defaultFallbackDate = new Date();

  constructor() {
    effect(() => {
      const matchTab = this.tabsConfig.find(t => t.value === this.activeTab());
      const tabLabel = matchTab ? matchTab.label : 'Documentos';
      setTimeout(() => {
        this.breadcrumbService.setDynamicBreadcrumb(tabLabel);
        this.breadcrumbService.setDynamicTitle(`Trabajo de Grado - ${tabLabel}`);
        this.titleService.setTitle(`Trabajo de Grado - ${tabLabel}`);
      });
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id') || this.route.parent?.snapshot.paramMap.get('id');
    if (id) this.thesisWorkId.set(id);
  }

  ngOnDestroy(): void {
    this.breadcrumbService.clearDynamicBreadcrumb();
    this.breadcrumbService.setDynamicTitle(null);
  }

  private readonly currentThesisWork = computed(() => {
    const id = this.thesisWorkId();
    return id ? this.thesisWorkService.thesisWorks().find(w => w.thesisWorkId === id) : null;
  });

  currentStrategy = computed<TabConfiguration>(() => {
    return this.tabStrategies[this.activeTab()] || AdvancesTabConfig;
  });

  evaluationContext = computed<ThesisEvaluationContext>(() => {
    const thesis = this.currentThesisWork();
    const user = this.authService.currentUser();
    const isAdmin = this.authService.hasAnyRole([UserRoleType.ADMINISTRADOR]);
    const isDecanatura = this.authService.hasAnyRole([UserRoleType.DECANATURA]);
    const isConsejo = this.authService.hasAnyRole([UserRoleType.CONSEJO]);

    const baseContext: ThesisEvaluationContext = {
      thesisWork: thesis ?? null,
      currentUser: user,
      isAdmin,
      isDecanatura,
      isConsejo,
      isStudent: thesis?.preliminaryDraftData?.proposalData?.authors?.some(
        (a: { id?: string } | string) => (typeof a === 'string' ? a : a.id) === user?.id
      ) ?? false,
      isDirector: thesis?.preliminaryDraftData?.proposalData?.director?.id === user?.id,
      isCodirector: thesis?.preliminaryDraftData?.proposalData?.codirector?.id === user?.id,
      isAdvisor: thesis?.preliminaryDraftData?.proposalData?.advisor?.id === user?.id,
      isJuror: thesis?.sustentations?.[0]?.assignedJurors?.some(
        (j: User) => j.id === user?.id
      ) ?? false,
      latestAdvanceId: null,
      isLatestAdvancePending: false
    };

    return this.currentStrategy().enrichEvaluationContext(baseContext);
  });

  currentColumns = computed(() => this.currentStrategy().columns);

  currentHeaderButtons = computed(() => this.currentStrategy().getHeaderButtons(this.evaluationContext()));

  currentTableData = computed(() => {
    const context = this.evaluationContext();
    const thesis = context.thesisWork;
    if (!thesis) return [];

    const docs = this.activeTab() === 'AVANCES' ? [] : (thesis.documents || []);
    return this.currentStrategy().getTableData(docs, context);
  });

  selectedAdvanceDocuments = computed<string[]>(() => {
    const advance = this.selectedAdvance();
    return advance?.documents?.map((d: Document) => d.name) || [];
  });

  studentName = computed<string>(() => {
    const authors = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.authors;
    return this.userService.getAuthorsNames(authors) || 'Sin estudiante';
  });

  directorName = computed<string>(() => {
    const director = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.director;
    return this.getUserFullName(director) || 'Sin director';
  });

  codirectorName = computed<string | undefined>(() => {
    const codirector = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.codirector;
    return this.getUserFullName(codirector);
  });

  advisorName = computed<string | undefined>(() => {
    const advisor = this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.advisor;
    return this.getUserFullName(advisor);
  });

  modalityName = computed<string>(() => {
    return this.evaluationContext().thesisWork?.preliminaryDraftData?.proposalData?.modality || 'Sin modalidad';
  });

  // ← NUEVO: header del modal para SOLICITUDES
  modalDetailsHeader = computed<string>(() => {
    if (this.activeTab() === 'AVANCES') return 'Detalles del avance';
    if (this.activeTab() === 'ENTREGA FINAL') return 'Detalles de la Entrega Final';
    if (this.activeTab() === 'PAZ Y SALVO') return 'Detalles de Paz y Salvo';
    if (this.activeTab() === 'CORRESPONDENCIA') return 'Detalles de Correspondencia';
    if (this.activeTab() === 'SOLICITUDES') return 'Detalles de la Solicitud Especial';  // ← NUEVO
    return 'Detalles del Registro';
  });

  // ← NUEVO: subtítulo del modal para SOLICITUDES
  modalDetailsSubtitle = computed<string>(() => {
    if (this.activeTab() === 'AVANCES') return 'Información del avance cargado';
    if (this.activeTab() === 'ENTREGA FINAL') return 'Información de los documentos de entrega final';
    if (this.activeTab() === 'PAZ Y SALVO') return 'Información de aprobaciones académicas y financieras';
    if (this.activeTab() === 'CORRESPONDENCIA') return 'Información de la resolución o correspondencia oficial';
    if (this.activeTab() === 'SOLICITUDES') return 'Información de la solicitud y su documento adjunto';  // ← NUEVO
    return 'Información del documento cargado';
  });

  private getUserFullName(user?: User): string | undefined {
    if (!user) return undefined;
    return `${user.firstName || ''} ${user.lastName || ''}`.trim();
  }

  handleHeaderButton(button: TableButton): void {
    const routePath = this.currentStrategy().headerActionRoute;
    if (routePath) {
      this.router.navigate([routePath], { relativeTo: this.route });
    } else {
      this.isUploadModalOpen.set(true);
    }
  }

  handleTableAction(event: { action: string; row: Record<string, unknown> }): void {
    const rowAllowedActions = event.row['allowedActions'] as string[] | undefined;
    const rowId = event.row['id'] as string;
    if (rowAllowedActions && !rowAllowedActions.includes(event.action)) {
      this.showRestrictedActionNotification();
      return;
    }

    switch (event.action) {
      case 'download': {
        const urlObj = typeof event.row['url'] === 'string' ? event.row['url'] : '';
        const nameObj = typeof event.row['name'] === 'string' ? event.row['name'] : 'documento_sin_titulo';
        this.handleDownload({ url: urlObj, name: nameObj } as Document);
        break;
      }
      case 'evaluate-advance':
        this.router.navigate(['evaluate_advance', rowId], { relativeTo: this.route });
        break;
      case 'evaluate_special_request':
        this.router.navigate([`./evaluate_special_request`, rowId], { relativeTo: this.route });
        break;
      case 'view_sustentation_details':
      case 'evaluate_sustentation':
        this.router.navigate([event.action, rowId], { relativeTo: this.route });
        break;
      case 'view-details':
        this.openDetailsModal(rowId);
        break;
      default:
        this.router.navigate([event.action], { relativeTo: this.route });
        break;
    }
  }

  onFileSelected(event: { fileName: string; file: File }): void {
    this.uploadContext.set(event);
    this.isUploadModalOpen.set(false);
    this.isConfirmModalOpen.set(true);
  }

  confirmUpload(): void {
    const selectedFileData = this.uploadContext();
    const thesisId = this.thesisWorkId();
    if (!selectedFileData || !thesisId) return;
    this.showProcessingNotification();
    const newDocumentRecord: Document = {
      id: crypto.randomUUID(),
      name: selectedFileData.fileName.replace('.pdf', ''),
      url: '',
      uploadDate: this.formatDate(new Date()),
      type: this.currentStrategy().modalConfig.uploadDocumentType,
      status: stateList.EN_REVISION
    };
    this.thesisWorkService.uploadDocumentMock(thesisId, newDocumentRecord).subscribe({
      next: () => {
        this.showSuccessNotification();
        this.cancelUpload();
      },
      error: (err) => {
        console.error('Error detectado en la carga de archivos:', err);
        this.showErrorNotification();
      }
    });
  }

  cancelUpload(): void {
    this.isConfirmModalOpen.set(false);
    this.uploadContext.set(null);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  ensureDate(date: Date | string | undefined | null): Date {
    if (date instanceof Date && !isNaN(date.getTime())) {
      return date;
    }
    if (typeof date === 'string' && date.trim() !== '') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  downloadDocumentByName(fileName: string): void {
    let targetDocument: Document | undefined;

    if (this.activeTab() === 'AVANCES') {
      targetDocument = this.selectedAdvance()?.documents?.find(
        (doc: Document) => doc.name === fileName
      );
    } else {
      targetDocument = this.currentThesisWork()?.documents?.find(
        (doc: Document) => doc.name === fileName
      );
    }

    if (targetDocument) {
      this.handleDownload(targetDocument);
    } else {
      this.handleDownload({ name: fileName, url: '' } as Document);
    }
  }

  private openDetailsModal(rowId: string): void {
    const thesis = this.currentThesisWork();
    if (!thesis) return;

    if (this.activeTab() === 'AVANCES') {
      const advance = thesis.advances?.find(a => a.id === rowId);
      if (advance) {
        this.selectedAdvance.set(advance);
        this.isDetailsModalOpen.set(true);
      } else {
        this.showNotFoundError();
      }
    }
    else if (this.activeTab() === 'ENTREGA FINAL') {
      const delivery = thesis.finalDeliveries?.find(d => d.id === rowId);
      if (!delivery) {
        this.showNotFoundError();
        return;
      }

      const finalDeliveryDocs: Document[] = [delivery.monograph, delivery.formatE];
      if (delivery.annexes) {
        finalDeliveryDocs.push(delivery.annexes);
      }

      const deliveryMock: Advance = {
        id: delivery.id,
        title: 'Entrega Final del Trabajo de Grado',
        comments: 'Documentos oficiales cargados para el proceso de revisión y sustentación.',
        uploadDate: delivery.uploadDate,
        studentId: '',
        status: delivery.status || stateList.EN_REVISION,
        documents: finalDeliveryDocs
      };

      this.selectedAdvance.set(deliveryMock);
      this.isDetailsModalOpen.set(true);
    }
    else if (this.activeTab() === 'PAZ Y SALVO') {
      const pyS = thesis.pazYSalvos?.find(p => p.document.id === rowId);
      if (!pyS) {
        this.showNotFoundError();
        return;
      }

      let formatComments = `Aprobación Académica: ${pyS.academicApproved ? '✅ Sí' : '❌ No'}`;
      if (pyS.academicComments) formatComments += `\nObs: ${pyS.academicComments}`;

      formatComments += `\n\nAprobación Financiera: ${pyS.financialApproved ? '✅ Sí' : '❌ No'}`;
      if (pyS.financialComments) formatComments += `\nObs: ${pyS.financialComments}`;

      const pazYSalvoMock: Advance = {
        id: pyS.id,
        title: 'Registro de Paz y Salvo Institucional',
        comments: formatComments,
        uploadDate: pyS.registrationDate,
        studentId: '',
        status: pyS.document.status || stateList.EN_REVISION,
        documents: [pyS.document]
      };

      this.selectedAdvance.set(pazYSalvoMock);
      this.isDetailsModalOpen.set(true);
    }
    else if (this.activeTab() === 'CORRESPONDENCIA') {
      const doc = thesis.documents?.find(d => d.id === rowId);
      if (!doc) {
        this.showNotFoundError();
        return;
      }

      const correspondenceMock: Advance = {
        id: doc.id,
        title: 'Resolución / Correspondencia Final Oficial',
        comments: 'Documento oficial cargado por el Jurado Evaluador (Formato_H) que ratifica y da por terminado formalmente el proceso del trabajo de grado.',
        uploadDate: doc.uploadDate,
        studentId: '',
        status: doc.status || stateList.APROBADO,
        documents: [doc]
      };

      this.selectedAdvance.set(correspondenceMock);
      this.isDetailsModalOpen.set(true);
    }
    // ← NUEVO: case SOLICITUDES ───────────────────────────────────────────
    else if (this.activeTab() === 'SOLICITUDES') {
      const specialRequest = thesis.specialRequests?.find(
        (r: SpecialRequest) => r.id === rowId
      );
      if (!specialRequest) {
        this.showNotFoundError();
        return;
      }

      // Construye el texto de comentarios con todos los campos disponibles del modelo
      const commentParts: string[] = [specialRequest.description];

      if (specialRequest.resolutionDetails) {
        commentParts.push(`Resolución del comité: ${specialRequest.resolutionDetails}`);
      }
      if (specialRequest.grantedDeadline) {
        const deadline = new Date(specialRequest.grantedDeadline)
          .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        commentParts.push(`Fecha concedida: ${deadline}`);
      }

      const specialRequestMock: Advance = {
        id: specialRequest.id,
        title: specialRequest.requestType,   // Usa el enum legible: "Prórroga", "Cancelación", etc.
        comments: commentParts.join('\n\n'),
        uploadDate: specialRequest.requestDate,
        studentId: specialRequest.directorId,
        status: specialRequest.status,
        documents: []                         // SpecialRequest no tiene documentos en el modelo actual
      };

      this.selectedAdvance.set(specialRequestMock);
      this.isDetailsModalOpen.set(true);
    }
    // ─────────────────────────────────────────────────────────────────────
  }

  private formatDate(date: Date): string {
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replaceAll('/', ' - ');
  }

  private handleDownload(doc: Document): void {
    if (!doc.url) {
      this.notificationService.show({ title: 'Error de descarga', message: 'No existe una URL válida vinculada a este archivo.', type: NotificationType.ERROR });
      return;
    }
    this.downloadService.download(doc.url, `${doc.name}.pdf`);
  }

  private showNotFoundError(): void {
    this.notificationService.show({ title: 'Registro no encontrado', message: 'No fue posible cargar los detalles de este registro.', type: NotificationType.ERROR });
  }

  private showProcessingNotification() {
    this.notificationService.show({ title: 'Subiendo documento', message: 'Procesando el archivo PDF y actualizando los registros...', type: NotificationType.INFO });
  }

  private showSuccessNotification() {
    this.notificationService.show({ title: '¡Carga exitosa!', message: 'El documento se cargó correctamente y el flujo de estados ha sido actualizado.', type: NotificationType.CONFIRMATION });
  }

  private showErrorNotification() {
    this.notificationService.show({ title: 'Error de carga', message: 'Hubo un problema al subir el archivo. Inténtelo de nuevo.', type: NotificationType.ERROR });
  }

  private showRestrictedActionNotification() {
    this.notificationService.show({ title: 'Acción no permitida', message: 'Su usuario no posee los privilegios necesarios para ejecutar esta evaluación.', type: NotificationType.ERROR });
  }
}
