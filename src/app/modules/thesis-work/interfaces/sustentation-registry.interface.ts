import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { User } from "../../users/interfaces/user.interface";
import { SustentationStatus } from "../enums/sustentation-status.enum";
import { JurorVerdict } from "./juror-verdict.interface";

export interface SustentationRegistry {
  id: string;
  status?: SustentationStatus;
  sustentationDate?: Date;
  sustentationTime?: string;
  location?: string;
  assignedJurors: User[];
  formatEDocument?: FileDocument;
  verdicts: JurorVerdict[];
}
