import { ProjectStage } from "../enum/projectStage.enum";
import { ProjectStatus } from "../enum/projectStatus.enum";

export interface RawProjectData {
  id: string;
  title: string;
  stage: ProjectStage;
  status: ProjectStatus;
  period: string;
  directorId: string;
  directorName: string;
  registrationDate: Date;
}
