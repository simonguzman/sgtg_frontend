import { User } from '../../users/interfaces/user.interface';

export interface ArchivedBaseProposal {
  title?: string;
  modality?: string;
  authors?: (string | User)[];
  director?: User;
  codirector?: User;
  advisor?: User;
}
