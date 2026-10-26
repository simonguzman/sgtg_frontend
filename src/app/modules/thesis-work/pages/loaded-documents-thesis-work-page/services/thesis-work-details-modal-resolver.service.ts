import { Injectable } from '@angular/core';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { Advance } from '../../../interfaces/advance.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { SpecialRequest } from '../../../interfaces/special-request.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { formatThesisDate } from '../../../helpers/thesis-date.helper';
import { RegisterDetailField } from '../../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';

/** Registro para el modal de detalles; si trae `fields`, sus datos se muestran cada uno con su etiqueta. */
export type RegisterDetail = Advance & { fields?: RegisterDetailField[] };

/** Etiqueta de la fecha que concede el Consejo al aprobar, según el tipo de solicitud */
const FECHA_CONCEDIDA: Partial<Record<SpecialRequestType, string>> = {
  [SpecialRequestType.SUSPENSION]: 'Reanudación a más tardar',
  [SpecialRequestType.NUEVA_SUSTENTACION]: 'Nueva fecha de la sesión'
};

@Injectable({ providedIn: 'root' })
export class ThesisWorkDetailsModalResolverService {

  public resolve(rowId: string, activeTab: string, thesis: ThesisWork): RegisterDetail | null {
    switch (activeTab) {
      case 'AVANCES': return this.resolveAdvance(rowId, thesis);
      case 'ENTREGA FINAL': return this.resolveDelivery(rowId, thesis);
      case 'PAZ Y SALVO': return this.resolvePazYSalvo(rowId, thesis);
      case 'CORRESPONDENCIA': return this.resolveCorrespondence(rowId, thesis);
      case 'SOLICITUDES': return this.resolveSpecialRequest(rowId, thesis);
      default: return null;
    }
  }

  /** Informe mensual: quién lo radicó, sus observaciones y sus revisiones, cada uno con su etiqueta. */
  private resolveAdvance(rowId: string, thesis: ThesisWork): RegisterDetail | null {
    const advance = thesis.advances?.find(item => item.id === rowId);
    if (!advance) return null;
    const fields: RegisterDetailField[] = [];
    if (advance.uploadedBy) fields.push({ label: 'Radicado por', value: advance.uploadedBy });
    fields.push({ label: 'Observaciones', value: advance.comments || 'Sin observaciones de quien radica.' });
    const reviews = (thesis.evaluations ?? []).filter(evaluation => evaluation.advanceId === advance.id);
    if (reviews.length) {
      fields.push({ label: 'Revisiones', values: reviews.map(review =>
        `${review.evaluatorName} (${formatThesisDate(new Date(review.date))}): ${review.observations || 'ver notas adjuntas'}`) });
    }
    return { ...advance, fields };
  }

  private resolveDelivery(rowId: string, thesis: ThesisWork): Advance | null {
    const delivery = thesis.finalDeliveries?.find(d => d.id === rowId);
    if (!delivery) return null;

    const docs = [delivery.monograph, delivery.formatE, delivery.pazYSalvo, delivery.advisorConcept, delivery.annexes]
      .filter((document, i, todos): document is FileDocument => !!document && todos.indexOf(document) === i);

    return {
      id: delivery.id,
      title: 'Solicitud de sustentación',
      comments: 'Monografía, formato E y paz y salvo (y, en práctica profesional, el concepto del asesor) '
        + 'que adjuntó el director al solicitar la sustentación.',
      uploadDate: delivery.uploadDate,
      studentId: '',
      status: delivery.status ?? stateList.EN_REVISION,
      documents: docs
    };
  }

  private resolvePazYSalvo(rowId: string, thesis: ThesisWork): Advance | null {
    const pyS = thesis.pazYSalvos?.find(p => p.document.id === rowId);
    if (!pyS) return null;

    const comments = 'Paz y salvo (formato F) que adjuntó el director a la solicitud de sustentación.';

    return {
      id: pyS.id,
      title: 'Paz y salvo',
      comments,
      uploadDate: pyS.registrationDate,
      studentId: '',
      status: pyS.document.status ?? stateList.EN_REVISION,
      documents: [pyS.document]
    };
  }

  private resolveCorrespondence(rowId: string, thesis: ThesisWork): Advance | null {
    const document = thesis.documents?.find(document => document.id === rowId);
    if (!document) return null;

    return {
      id: document.id,
      title: 'Versión definitiva',
      comments: 'Versión definitiva (formato H) que cargó el jurado coordinador; con ella el trabajo de grado finalizó.',
      uploadDate: document.uploadDate,
      studentId: '',
      status: document.status ?? stateList.APROBADO,
      documents: [document]
    };
  }

  /**
   * Solicitud especial con sus datos separados: en el cambio de título y
   * objetivos, el título, los objetivos y la justificación; en las demás, la
   * descripción. Después, la decisión del Consejo y la fecha que concedió.
   */
  private resolveSpecialRequest(rowId: string, thesis: ThesisWork): RegisterDetail | null {
    const request = thesis.specialRequests?.find((r: SpecialRequest) => r.id === rowId);
    if (!request) return null;

    const fields: RegisterDetailField[] = [];
    if (request.proposedTitle) {
      if (request.previousTitle) fields.push({ label: 'Título anterior', value: request.previousTitle });
      fields.push({ label: 'Título propuesto', value: request.proposedTitle });
      const [generalObjective, ...specificObjectives] = request.proposedObjectives ?? [];
      if (generalObjective) fields.push({ label: 'Objetivo general', value: generalObjective });
      if (specificObjectives.length) fields.push({ label: 'Objetivos específicos', values: specificObjectives });
      fields.push({ label: 'Justificación', value: request.description });
    } else {
      fields.push({ label: 'Descripción', value: request.description });
    }
    if (request.resolutionDate) {
      fields.push({ label: 'Decisión del Consejo', value: `${request.status} (${formatThesisDate(request.resolutionDate)})` });
    }
    if (request.resolutionDetails) fields.push({ label: 'Observaciones del Consejo', value: request.resolutionDetails });
    const fechaConcedida = FECHA_CONCEDIDA[request.requestType];
    if (fechaConcedida && request.grantedDeadline && request.status === stateList.APROBADO) {
      fields.push({ label: fechaConcedida, value: formatThesisDate(new Date(request.grantedDeadline)) });
    }

    const documents: FileDocument[] = [...(request.documents ?? [])];
    if (request.resolution) documents.push(request.resolution);

    return {
      id: request.id,
      title: request.requestType,
      comments: request.description,
      fields,
      uploadDate: request.requestDate,
      studentId: request.directorId,
      status: request.status,
      documents
    };
  }
}
