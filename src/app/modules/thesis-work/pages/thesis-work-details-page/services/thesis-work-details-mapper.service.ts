import { Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisWorkDeadlineItem, ThesisWorkDetailsView } from '../models/thesis-work-details-page.model';
import { DocumentType } from '../../../../../core/enums/document-type.enum';
import { versionVigente } from '../../../../preliminary-draft/services/preliminary-draft-rules';
import { buildWorkDetailsView, fullName } from '../../../../../shared/components/work-details/work-details.builder';
import { WorkDetailsDocument, WorkDetailsItem } from '../../../../../shared/components/work-details/work-details.model';

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsMapperService {

  /**
   * Información registrada del trabajo de grado: la de la propuesta, los
   * evaluadores del anteproyecto y los jurados, las fechas del backend, la
   * resolución del Consejo y el anteproyecto aprobado.
   */
  public mapToView(thesisWork: ThesisWork): ThesisWorkDetailsView {
    const draft = thesisWork.preliminaryDraftData;
    const anteproyecto = versionVigente(draft);
    const resolucion = this.extractMainDocument(thesisWork);
    return buildWorkDetailsView(draft.proposalData, {
      heading: 'Información del trabajo de grado',
      state: thesisWork.state,
      extraParticipants: [this.evaluators(thesisWork), this.jurors(thesisWork)],
      dates: this.mapDeadlines(thesisWork),
      documents: [
        resolucion,
        anteproyecto && { name: anteproyecto.name, description: 'Anteproyecto aprobado', url: anteproyecto.url }
      ]
    });
  }

  private evaluators(thesisWork: ThesisWork): WorkDetailsItem | null {
    const evaluadores = thesisWork.preliminaryDraftData.evaluators ?? [];
    return evaluadores.length
      ? { label: 'Evaluadores del anteproyecto', value: evaluadores.map(fullName).join(' y ') }
      : null;
  }

  /** Jurados de la sesión de sustentación más reciente, con el coordinador señalado. */
  private jurors(thesisWork: ThesisWork): WorkDetailsItem | null {
    const sesion = thesisWork.sustentations?.[0];
    const jurados = sesion?.assignedJurors ?? [];
    if (!jurados.length) return null;
    return {
      label: 'Jurados de la sustentación',
      value: jurados.map(jurado => fullName(jurado) + (jurado.id === sesion?.coordinatorId ? ' (coordinador)' : ''))
        .join(' y ')
    };
  }

  /** Fechas del backend que aplican al trabajo (las que ya no aplican llegan vacías). */
  private mapDeadlines(thesisWork: ThesisWork): ThesisWorkDeadlineItem[] {
    const deadlines = thesisWork.deadlines;
    if (!deadlines) return [];
    const items: (ThesisWorkDeadlineItem | null)[] = [
      deadlines.startDate ? { label: 'Inicio del trabajo', date: deadlines.startDate,
        hint: 'Notificación de la aprobación del anteproyecto' } : null,
      deadlines.maximumDeliveryDate ? { label: 'Fecha máxima de entrega', date: deadlines.maximumDeliveryDate,
        hint: 'Incluye la prórroga y el tiempo de suspensión, si los hubo' } : null,
      deadlines.minimumSustentationDate ? { label: 'Sustentación desde', date: deadlines.minimumSustentationDate,
        hint: 'Primera fecha en la que se puede solicitar la sustentación' } : null,
      deadlines.objectivesChangeDeadline ? { label: 'Límite para cambiar título y objetivos',
        date: deadlines.objectivesChangeDeadline } : null,
      deadlines.extensionRequestDeadline ? { label: 'Límite para solicitar prórroga',
        date: deadlines.extensionRequestDeadline } : null
    ];
    return items.filter((item): item is ThesisWorkDeadlineItem => item !== null);
  }

  /** Resolución del Consejo que aprobó el anteproyecto. */
  private extractMainDocument(thesisWork: ThesisWork): WorkDetailsDocument | null {
    const preliminaryDraft = thesisWork.preliminaryDraftData;
    if (!preliminaryDraft) return null;

    const description = 'Resolución del Consejo de Facultad que aprobó el anteproyecto';
    const evaluations = preliminaryDraft.evaluations || [];

    const consejoEvaluations = evaluations.filter(evaluation => evaluation.evaluatorRole?.toUpperCase().includes('CONSEJO'));
    const resolutionDoc = consejoEvaluations.at(-1)?.signedDocuments?.at(-1);
    if (resolutionDoc) return { name: resolutionDoc.name, url: resolutionDoc.url, description };

    const resolutionInDraft = (preliminaryDraft.documents || []).find(document => document.type === DocumentType.RESOLUCION)
      ?? (thesisWork.documents || []).find(document => document.type === DocumentType.RESOLUCION);
    return resolutionInDraft ? { name: resolutionInDraft.name, url: resolutionInDraft.url, description } : null;
  }
}
