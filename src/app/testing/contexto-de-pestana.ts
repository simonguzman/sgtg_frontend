import { ThesisEvaluationContext } from '../modules/thesis-work/pages/loaded-documents-thesis-work-page/tabs-logic/tab-config.interface';
import { ThesisWork } from '../modules/thesis-work/interfaces/thesis-work.interface';
import { User } from '../modules/users/interfaces/user.interface';

/** Contexto de una pestaña de "Documentos cargados" para el trabajo y el rol indicados (usuario 1 por defecto). */
export function contextoDePestana(thesisWork: ThesisWork,
  overrides: Partial<ThesisEvaluationContext> = {}): ThesisEvaluationContext {
  return {
    thesisWork, currentUser: { id: '1' } as User, isAdmin: false, isStudent: false, isDirector: false,
    isDecanatura: false, isCodirector: false, isAdvisor: false, isJuror: false, isConsejo: false,
    isCoordinator: false, latestAdvanceId: null, isLatestAdvancePending: false, isArchived: thesisWork.isArchived,
    ...overrides
  };
}
