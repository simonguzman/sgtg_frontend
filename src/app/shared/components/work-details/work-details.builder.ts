import { Proposal } from '../../../modules/proposal/interfaces/proposal.interface';
import { User } from '../../../modules/users/interfaces/user.interface';
import { aFecha } from '../../../core/mappers/trabajo-grado.mapper';
import { ProposalContent, WorkDetailsDate, WorkDetailsDocument, WorkDetailsItem, WorkDetailsView } from './work-details.model';

/** Datos propios de cada página de detalle. */
export interface WorkDetailsOptions {
  heading: string;
  state: string;
  /** Participantes de la etapa además de los de la propuesta (evaluadores, jurados) */
  extraParticipants?: (WorkDetailsItem | null)[];
  /** Las fechas sin valor no se muestran */
  dates?: ({ label: string; date: Date | string | null | undefined; hint?: string } | null)[];
  /** Los documentos sin URL no se muestran */
  documents?: (WorkDetailsDocument | null | undefined)[];
}

/**
 * Arma la información de la página de detalle con lo registrado en la
 * propuesta (título, objetivos, descripción, línea de investigación,
 * modalidad y participantes) y lo propio de la etapa. Los campos opcionales
 * vacíos quedan fuera.
 */
export function buildWorkDetailsView(proposal: Proposal, options: WorkDetailsOptions): WorkDetailsView {
  const content = proposalContent(proposal);

  const participants: (WorkDetailsItem | null)[] = [
    { label: proposal.authors.length > 1 ? 'Estudiantes' : 'Estudiante', value: proposal.authors.map(fullName).join(', ') },
    { label: 'Director', value: proposal.director ? fullName(proposal.director) : 'No asignado' },
    proposal.codirector ? { label: 'Codirector', value: fullName(proposal.codirector) } : null,
    proposal.advisor ? { label: 'Asesor', value: fullName(proposal.advisor) } : null,
    content.organization ? { label: 'Organización', value: content.organization } : null,
    ...(options.extraParticipants ?? [])
  ];

  return {
    heading: options.heading,
    title: proposal.title,
    generalObjective: content.generalObjective,
    specificObjectives: content.specificObjectives,
    description: content.description,
    lineOfResearch: content.lineOfResearch,
    modality: proposal.modality,
    state: options.state,
    participants: participants.filter((item): item is WorkDetailsItem => !!item?.value),
    dates: (options.dates ?? []).flatMap((item): WorkDetailsDate[] => {
      const date = item ? toDate(item.date) : null;
      return item && date ? [{ label: item.label, date, hint: item.hint }] : [];
    }),
    documents: (options.documents ?? []).filter((document): document is WorkDetailsDocument => !!document?.url)
  };
}

/**
 * Objetivos, descripción, línea de investigación y organización registrados
 * en la propuesta; los opcionales vacíos quedan sin valor.
 */
export function proposalContent(proposal: Proposal): ProposalContent {
  const objectives = (proposal.objectives ?? []).map(objective => objective.trim()).filter(Boolean);
  const generalObjective = objectives[0];
  const description = proposal.description?.trim();
  return {
    generalObjective,
    specificObjectives: objectives.slice(1),
    // La descripción es opcional: si no se registró, el front la llena con el objetivo general
    description: description && description !== generalObjective ? description : undefined,
    lineOfResearch: proposal.lineOfResearch?.trim() || undefined,
    organization: proposal.organization?.trim() || undefined
  };
}

/** Texto de los días hábiles que quedan de un plazo (los calcula el backend). */
export function remainingDaysHint(days: number | null | undefined): string | undefined {
  if (days === null || days === undefined) return undefined;
  if (days === 0) return 'Vence hoy';
  const n = Math.abs(days);
  const unidad = n === 1 ? 'día hábil' : 'días hábiles';
  if (days < 0) return `Vencido hace ${n} ${unidad}`;
  const verbo = n === 1 ? 'Queda' : 'Quedan';
  return `${verbo} ${n} ${unidad}`;
}

/** Fecha válida o null; las de texto se leen como el mapper (sin correr el día). */
function toDate(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  return aFecha(value);
}

/** Nombre completo de una persona (sin espacios repetidos). */
export function fullName(user: User): string {
  return [user.firstName, user.secondName, user.lastName, user.secondLastName]
    .map(part => part?.trim())
    .filter(Boolean)
    .join(' ');
}
