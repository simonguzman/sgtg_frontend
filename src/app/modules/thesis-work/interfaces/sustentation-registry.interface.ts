import { FileDocument } from "../../../core/interfaces/file-document.interface";
import { User } from "../../users/interfaces/user.interface";
import { SustentationStatus } from "../enums/sustentation-status.enum";
import { JurorVerdict } from "./juror-verdict.interface";

/** Sesión de sustentación programada por el Consejo. */
export interface SustentationRegistry {
  id: string;
  /** Número de la sesión (1 o 2) */
  number?: number;
  status?: SustentationStatus;
  sustentationDate?: Date;
  sustentationTime?: string;
  location?: string;
  /** Los dos jurados; el primero es el coordinador */
  assignedJurors: User[];
  /** Jurado coordinador: califica, registra la inasistencia, verifica los ajustes y carga la versión definitiva */
  coordinatorId?: string;
  formatEDocument?: FileDocument;
  verdicts: JurorVerdict[];
  /** Inasistencia registrada por el coordinador, si la hubo */
  nonAttendance?: { observations: string; date: Date };
}
