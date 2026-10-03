import { User } from "../../users/interfaces/user.interface";

export interface HistoryEvaluationContext {
  currentUser: User | null;
  hasGlobalAccess: boolean;
}
