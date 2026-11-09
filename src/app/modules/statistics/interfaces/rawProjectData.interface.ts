import { ProjectStage } from '../enum/projectStage.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

export interface RawProjectData {
  id: string;
  title: string;
  stage: ProjectStage;
  status: ProjectStatus;
  originalState: stateList;
  period: string;
  directorId: string;
  directorName: string;
  registrationDate: Date;
  isArchived: boolean;
  deadlineStatus: EvaluationDeadlineStatus | null;
  /** Modalidad del trabajo (investigación o práctica profesional) */
  modality: string;
  /** Programa de los estudiantes */
  program: string;
  /** Trabajo de grado en curso o en prórroga a 30 días o menos de la fecha máxima de entrega (lo decide el backend) */
  dueSoon?: boolean;
  /** Fecha máxima de entrega del trabajo de grado */
  deliveryDate?: Date | null;
  /** Días calendario que faltan para la fecha máxima de entrega */
  daysUntilDelivery?: number | null;
  /** Estudiantes del trabajo, para la tabla de próximos a vencer */
  studentNames?: string;
}

/** Datos de la etapa que alcanzó el trabajo; la modalidad y el programa son del trabajo. */
export type ProjectStageData = Omit<RawProjectData, 'modality' | 'program'>;
