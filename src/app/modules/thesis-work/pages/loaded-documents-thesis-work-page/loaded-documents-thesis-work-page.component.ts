import { Component, computed, effect, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { TabConfiguration, ThesisEvaluationContext } from './tabs-logic/tab-config.interface';
import { AdvancesTabConfig } from './tabs-logic/advaces.tab';
import { UserRoleType } from '../../../../core/models/user-role';
import { TableButton, TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { ActivatedRoute, Router } from '@angular/router';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { FileDownloadService } from '../../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/Breadcrumb.service';
import { Title } from '@angular/platform-browser';
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
  selectedAdvance = signal<any | null>(null);

  // Fallback seguro de fecha para evitar la inicialización nativa directa en el HTML
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
        (j: any) => (typeof j === 'string' ? j : j.id) === user?.id
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

  // ==========================================
  // 🧠 PROCESADORES REACTIVOS PARA EL MODAL DE DETALLES
  // ==========================================
  selectedAdvanceDocuments = computed<string[]>(() => {
    const advance = this.selectedAdvance();
    return advance?.documents?.map((d: Document) => d.name) || [];
  });

  studentName = computed<string>(() => {
    const authors = this.evaluationContext()
      .thesisWork
      ?.preliminaryDraftData
      ?.proposalData
      ?.authors;

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
    return this.evaluationContext()
      .thesisWork
      ?.preliminaryDraftData
      ?.proposalData
      ?.modality || 'Sin modalidad';
  });

  private getUserFullName(user: any): string | undefined {
    if (!user) return undefined;

    // Caso: viene directamente como string
    if (typeof user === 'string') {
      return user;
    }

    // Caso: objeto User completo
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }

    // Caso fallback
    if (user.name) {
      return user.name;
    }

    return undefined;
  }

  // ==========================================
  // 🚀 MANEJO DE ACCIONES Y EVENTOS
  // ==========================================
  handleHeaderButton(button: TableButton): void {
    if (button.label?.toLowerCase().includes('cargar') || button.label?.toLowerCase().includes('registrar')) {
      if (this.activeTab() === 'AVANCES') {
        this.router.navigate(['upload_advance'], { relativeTo: this.route });
      } else if (this.activeTab() === 'ENTREGA FINAL') {
        this.router.navigate(['upload_final_delivery'], { relativeTo: this.route });
      } else if (this.activeTab() === 'PAZ Y SALVO') {
        this.router.navigate(['register_paz_y_salvo'], { relativeTo: this.route });
      } else if (this.activeTab() === 'SUSTENTACION') {
        this.router.navigate(['register_sustentation'], { relativeTo: this.route });
      } else if (this.activeTab() === 'CORRESPONDENCIA') {
        this.router.navigate(['register_correspondence'], { relativeTo: this.route });
      } else if (this.activeTab() === 'SOLICITUDES') {
        this.router.navigate(['register_special_request'], { relativeTo: this.route });
      } else {
        this.isUploadModalOpen.set(true);
      }
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
      case 'download':
        this.handleDownload(event.row as unknown as Document);
        break;

      case 'evaluate-advance':
        this.router.navigate(['evaluate_advance', rowId], { relativeTo: this.route });
        break;

      case 'evaluate_special_request':
        this.router.navigate([`./evaluate_special_request`, rowId], { relativeTo: this.route });
        break;

      case 'view_sustentation_details':
        this.router.navigate([event.action, rowId], { relativeTo: this.route });
        break;
      case 'evaluate_sustentation':
        this.router.navigate([event.action, rowId], { relativeTo: this.route });
        break;
      case 'view-details':
        this.openAdvanceDetails(rowId);
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

  downloadAdvanceFile(fileName: string): void {
    const advance = this.selectedAdvance();
    if (!advance?.documents) return;

    const document = advance.documents.find((doc: Document) => doc.name === fileName);

    if (document?.url) {
      this.downloadService.download(document.url, fileName);
    } else {
      this.notificationService.show({
        title: 'Archivo no disponible',
        message: 'El archivo seleccionado no tiene una URL válida vinculada.',
        type: NotificationType.ERROR
      });
    }
  }

  private openAdvanceDetails(advanceId: string): void {
    const thesis = this.currentThesisWork();
    if (!thesis?.advances) return;

    const advance = thesis.advances.find(a => a.id === advanceId);

    if (!advance) {
      this.notificationService.show({
        title: 'No encontrado',
        message: 'No fue posible encontrar el avance seleccionado.',
        type: NotificationType.ERROR
      });
      return;
    }

    this.selectedAdvance.set(advance);
    this.isDetailsModalOpen.set(true);
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
