import { inject, Injectable } from '@angular/core';
import { RawProjectData } from '../interfaces/rawProjectData.interface';
import { ProjectStage } from '../enum/projectStage.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { ThesisWork } from '../../thesis-work/interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { UserService } from '../../users/services/user.service';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { resolveAcademicPeriod } from '../helpers/academic-period.helper';
import { mapStateToProjectStatus } from '../helpers/project-status.helper';

@Injectable({ providedIn: 'root' })
export class ProjectDataMapperService {
  private readonly userService = inject(UserService);

  mapProposal(proposal: Proposal): RawProjectData {
    const creationDate = this.resolveDate(proposal.createdAt);
    return {
      id: proposal.id ?? '',
      title: proposal.title,
      stage: ProjectStage.PROPUESTA,
      status: mapStateToProjectStatus(proposal.state),
      originalState: proposal.state,
      period: resolveAcademicPeriod(creationDate),
      directorId: proposal.director?.id ?? 'sin-director',
      directorName: this.resolveDirectorName(proposal.director),
      registrationDate: creationDate,
      isArchived: !!proposal.isArchived,
      // ← NUEVO: mismo criterio que getSingleEvaluationDeadlineLabel en
      // Historial — evaluations[0] es siempre la más reciente (unshift).
      deadlineStatus: this.resolveProposalDeadlineStatus(proposal)
    };
  }

  mapPreliminaryDraft(draft: PreliminaryDraft): RawProjectData {
    const creationDate = this.resolveDate(draft.createdData ?? draft.proposalData?.createdAt);
    const director = draft.proposalData?.director;
    return {
      id: draft.preliminaryDraftId ?? '',
      title: draft.proposalData?.title || 'Sin Título',
      stage: ProjectStage.ANTEPROYECTO,
      status: mapStateToProjectStatus(draft.state),
      originalState: draft.state,
      period: resolveAcademicPeriod(creationDate),
      directorId: director?.id ?? 'sin-director',
      directorName: this.resolveDirectorName(director),
      registrationDate: creationDate,
      isArchived: !!draft.isArchived,
      // ← NUEVO: mismo criterio ya aplicado en
      // ArchivedPreliminaryDraftsTabService (filtra por tipo de
      // documento, no por índice) y en resolveEvaluationsStatusLabel de
      // deadline-status-label.helper.ts (un evaluador en retraso marca
      // todo el conjunto como retrasado). Reimplementado aquí en vez de
      // importar esa función porque no está exportada.
      deadlineStatus: this.resolveDraftDeadlineStatus(draft)
    };
  }

  mapThesisWork(thesis: ThesisWork): RawProjectData {
    const creationDate = this.resolveDate(thesis.createdDate);
    const director = thesis.preliminaryDraftData?.proposalData?.director;
    return {
      id: thesis.thesisWorkId,
      title: thesis.preliminaryDraftData?.proposalData?.title || 'Sin Título',
      stage: ProjectStage.TRABAJO_GRADO,
      status: mapStateToProjectStatus(thesis.state),
      originalState: thesis.state,
      period: resolveAcademicPeriod(creationDate),
      directorId: director?.id ?? 'sin-director',
      directorName: this.resolveDirectorName(director),
      registrationDate: creationDate,
      isArchived: !!thesis.isArchived,
      // ← NULL a propósito, no un olvido: ThesisWorkEvaluationService.
      // addEvaluationMock nunca calcula deadlineStatus para las
      // evaluaciones de avances — a diferencia de Propuesta y
      // Anteproyecto, no compara contra getRemainingBusinessDays.
      // Extender esto exige decidir primero contra qué plazo se mediría
      // (por avance vs. entrega final) — fuera del alcance de este
      // cambio. Estos registros se muestran como "Sin evaluar", que es
      // honesto dado que ese cálculo no existe hoy para esta etapa.
      deadlineStatus: null
    };
  }

  private resolveProposalDeadlineStatus(proposal: Proposal): EvaluationDeadlineStatus | null {
    return proposal.evaluations?.[0]?.deadlineStatus ?? null;
  }

  private resolveDraftDeadlineStatus(draft: PreliminaryDraft): EvaluationDeadlineStatus | null {
    const latestDocId = draft.documents?.find(
      document => document.type === DocumentType.ANTEPROYECTO || document.type === DocumentType.CORRECCION
    )?.id;
    const relevantEvaluations: Evaluation[] = draft.evaluations?.filter(
      evaluation => latestDocId && evaluation.documentId === latestDocId
    ) ?? [];
    if (relevantEvaluations.length === 0) return null;
    const hasDelayed = relevantEvaluations.some(
      evaluation => evaluation.deadlineStatus === EvaluationDeadlineStatus.DELAYED
    );
    return hasDelayed ? EvaluationDeadlineStatus.DELAYED : EvaluationDeadlineStatus.ON_TIME;
  }

  private resolveDirectorName(director: User | undefined): string {
    return director ? this.userService.formatFullName(director) : 'Sin Asignar';
  }

  private resolveDate(raw: Date | string | undefined | null): Date {
    return raw ? new Date(raw) : new Date();
  }
}
