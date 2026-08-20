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
  deadlineStatus: EvaluationDeadlineStatus | null; // ← NUEVO
}
