import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';

// Interfaces & Models
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { NotificationType } from '../../components/notifications/models/notification.model';
import { Document } from '../../../core/interfaces/Document.interface';
import { Column, TableComponent } from '../../components/table-component/table-component.component';

// Services
import { ProposalService } from '../../../modules/proposal/services/proposal.service';
import { PreliminaryDraftService } from '../../../modules/preliminary-draft/services/preliminary-draft.service';
import { ThesisWorkService } from '../../../modules/thesis-work/services/thesis-work.service';

import { FileDownloadService } from '../../../core/services/filedownload/file-download.service';
import { NotificationService } from '../../components/notifications/services/notification.service';

// Components
import { EvaluationModalComponent } from '../../components/modals/evaluation-modal/evaluation-modal.component';
import { stateList } from '../../../core/enums/state.enum';
import { UserService } from '../../../modules/users/services/user.service';
import { ThesisWork } from '../../../modules/thesis-work/interfaces/thesis-work.interface';

const EVALUATIONS_COLUMNS: Column[] = [
  { field: 'evaluatorName',      header: 'Nombre',                type: 'text',   width: '20%' },
  { field: 'evaluatorRole',      header: 'Rol',                   type: 'text',   width: '20%' },
  { field: 'documentTargetName', header: 'Documento evaluado',   type: 'text',   width: '25%' },
  { field: 'veredict',           header: 'Resultado',             type: 'state',  width: '20%' },
  {
    field: 'acciones',
    header: 'Detalles',
    type: 'actions',
    width: '15%',
    actions: [
      { action: 'view_details', label: 'Ver detalles', variant: 'primary', disabled: false }
    ]
  }
];

@Component({
  selector: 'app-evaluations-performed-page',
  standalone: true,
  imports: [TableComponent, EvaluationModalComponent],
  templateUrl: './evaluations-performed-page.component.html',
  styleUrls: ['./evaluations-performed-page.component.css']
})
export class EvaluationsPerformedPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly proposalService = inject(ProposalService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly thesisWorkService = inject(ThesisWorkService);
  private readonly userService = inject(UserService);

  private readonly downloadService = inject(FileDownloadService);
  private readonly notificationService = inject(NotificationService);

  private readonly params = toSignal(this.route.paramMap);
  private readonly parentParams = toSignal(this.route.parent?.paramMap || this.route.paramMap);

  private readonly contextId = computed(() =>
    this.params()?.get('id') || this.parentParams()?.get('id')
  );

  protected readonly columns = EVALUATIONS_COLUMNS;

  protected evaluationsWithPermissions = computed(() => {
    const id = this.contextId();
    if (!id) return [];

    const currentUrl = this.router.url;
    const sessionUser = this.userService.currentUser();
    let rawEvaluations: Evaluation[] = [];
    let allDocuments: Document[] = [];
    let defaultTitle = 'Documento no identificado';

    // 1. Módulo Propuestas
    if (currentUrl.includes('proposal')) {
      const proposal = this.proposalService.proposals().find(p => p.id === id);
      if (proposal) {
        rawEvaluations = [...(proposal.evaluations || [])];
        allDocuments = proposal.documents || [];
        defaultTitle = proposal.title;
      }
    }
    // 2. Módulo Anteproyectos
    else if (currentUrl.includes('preliminary-draft')) {
      const draft = this.preliminaryDraftService.preliminaryDrafts()
        .find(d => d.preliminaryDraftId === id);

      if (draft) {
        rawEvaluations = [...(draft.evaluations || [])];
        allDocuments = draft.documents || [];
        defaultTitle = draft.proposalData.title;
      }
    }
    // 3. Módulo Trabajos de Grado
    else if (currentUrl.includes('thesis')) {
      const thesis = this.thesisWorkService.thesisWorks()
        .find((t: ThesisWork) => t.thesisWorkId === id);

      if (thesis) {
        rawEvaluations = [...(thesis.evaluations || [])];
        allDocuments = thesis.documents || [];
        defaultTitle = thesis.preliminaryDraftData?.proposalData?.title || 'Trabajo de Grado';

        // 🔄 ADAPTADOR CORREGIDO: Mapea el historial completo de Paz y Salvos
        if (thesis.pazYSalvos && thesis.pazYSalvos.length > 0) {
          thesis.pazYSalvos.forEach((pys) => {
            const isFullyApproved = pys.academicApproved && pys.financialApproved;

            // Si el usuario en sesión es Administrador, usamos su nombre real
            const adminName = sessionUser?.roles.includes('Administrador' as any)
              ? `${sessionUser.firstName} ${sessionUser.lastName}`.trim()
              : 'Revisión Institucional';

            rawEvaluations.push({
              id: pys.id,
              documentId: pys.document?.id || 'paz-y-salvo',
              date: pys.registrationDate,
              evaluatorName: adminName,
              evaluatorRole: 'Administración',
              veredict: isFullyApproved ? stateList.APROBADO : stateList.NO_APROBADO, // 💡 Ajustado a NO_APROBADO si no cumple ambos
              observations: `Académico: ${pys.academicComments || 'Aprobado'} | Financiero: ${pys.financialComments || 'Aprobado'}`
            } as unknown as Evaluation);
          });
        }

        // Adaptador Sustentaciones
        if (thesis.sustentations) {
          // ... (se mantiene igual tu lógica de sustentaciones)
          thesis.sustentations.forEach((sust: any) => {
            sust.verdicts?.forEach((verdict: any) => {
              const jurorName = sessionUser?.roles.includes('Jurado' as any)
                ? `${sessionUser.firstName} ${sessionUser.lastName}`.trim()
                : 'Jurado';

              rawEvaluations.push({
                id: verdict.id || crypto.randomUUID(),
                documentId: 'sustentacion-final',
                date: sust.sustentationDate,
                evaluatorName: jurorName,
                evaluatorRole: 'Jurado',
                veredict: verdict.veredict || stateList.EN_REVISION,
                observations: verdict.observations || 'Sin observaciones.'
              } as unknown as Evaluation);
            });
          });
        }
      }
    }

    // ORDENAMIENTO CONSISTENTE
    const sortedEvaluations = [...rawEvaluations].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateB - dateA;
    });

    return sortedEvaluations.map(evaluation => {
      const targetDocument = allDocuments.find(doc => doc.id === evaluation.documentId);
      const isCouncil = evaluation.evaluatorName?.toLowerCase().includes('consejo') || evaluation.evaluatorRole === 'Consejo';
      const isJuror = evaluation.evaluatorRole === 'Jurado';

      const evaluatorName = evaluation.evaluatorName || (isCouncil ? 'Consejo de Facultad' : 'Evaluador');
      const evaluatorRole = evaluation.evaluatorRole || (isCouncil ? 'Consejo' : 'Evaluador');

      let docName = targetDocument?.name;

      if (!docName) {
        if (isCouncil) docName = 'Presentación al consejo de facultad';
        else if (isJuror) docName = 'Acta de Sustentación';
        else docName = allDocuments.find(d => d.type?.includes('Formato'))?.name || defaultTitle;
      }

      // CORRECCIÓN: Estructurar el documento para que el modal lo reconozca
      const docsForModal = evaluation.signedDocuments && evaluation.signedDocuments.length > 0
        ? evaluation.signedDocuments
        : (targetDocument ? [{ name: targetDocument.name, url: targetDocument.url }] : []);

      return {
        ...evaluation,
        evaluatorName,
        evaluatorRole,
        observations: evaluation.observations || (evaluation as any).comments || 'Sin observaciones registradas.',
        documentTargetName: docName || defaultTitle,
        signedDocuments: docsForModal, // Asignación de archivos para la directiva [documents]
        allowedActions: ['view_details']
      };
    });
  });

  modalState = signal<{ open: boolean; evaluation: Evaluation | null }>({
    open: false, evaluation: null
  });

  ngOnInit(): void {
    if (!this.contextId()) {
      this.handleError('No se pudo identificar el registro.');
    }
  }

  handleTableAction(event: { action: string; row: any }): void {
    if (event.action === 'view_details') {
      this.modalState.set({ open: true, evaluation: event.row });
    }
  }

  closeModal(): void {
    this.modalState.set({ open: false, evaluation: null });
  }

  handleDownload(fileName: string): void {
    if (!fileName) {
      this.showNotification('Error', 'No se pudo localizar el documento.', NotificationType.ERROR);
      return;
    }
    this.showNotification('Descarga', 'Iniciando descarga...', NotificationType.INFO);
    this.downloadService.download(`assets/evaluaciones/${fileName}`, fileName);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  private showNotification(title: string, message: string, type: NotificationType): void {
    this.notificationService.show({ title, message, type });
  }

  private handleError(message: string): void {
    this.showNotification('Atención', message, NotificationType.ERROR);
    this.router.navigate(['/']);
  }
}
