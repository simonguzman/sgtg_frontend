import { Injector } from "@angular/core";
import { User } from "../../users/interfaces/user.interface";
import { ProposalService } from "../../proposal/services/proposal.service";
import { UserService } from "../../users/services/user.service";

export interface HistoryEvaluationContext {
  currentUser: User | null;
  hasGlobalAccess: boolean;
  injector: Injector;
  proposalService?: ProposalService;
  userService?: UserService;
}
