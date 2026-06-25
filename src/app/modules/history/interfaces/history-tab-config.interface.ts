
import { Injector } from '@angular/core';
import { Column } from '../../../shared/components/table-component/table-component.component';
import { User } from '../../users/interfaces/user.interface';
import { ProposalService } from '../../proposal/services/proposal.service';
import { UserService } from '../../users/services/user.service';

export interface HistoryEvaluationContext {
  currentUser: User | null;
  isAdmin: boolean;
  injector: Injector;
  proposalService?: ProposalService;
  userService?: UserService;
}

export interface HistoryTabConfiguration {
  tabValue: string;
  columns: Column[];

  // Retorna la data filtrada tanto por archivado como por pertenencia de rol
  getTableData: (context: HistoryEvaluationContext) => Record<string, unknown>[];
}
