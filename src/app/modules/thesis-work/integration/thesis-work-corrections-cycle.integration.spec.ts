// src/app/modules/thesis-work/integration/thesis-work-corrections-cycle.integration.spec.ts
import 'fake-indexeddb/auto';
import { TestBed } from '@angular/core/testing';
import { Injector } from '@angular/core';
import { waitForHydration } from '../../../testing/wait-for-hydration';

import { RegisterCorrectedDocumentsFacadeService } from '../pages/register-corrected-documents-page/services/register-corrected-documents-facade.service';
import { EvaluateCorrectionsFacadeService } from '../pages/evaluate-corrections-page/services/evaluate-corrections-facade.service';
import { ThesisWorkService } from '../services/thesis-work.service';
import { ThesisWorkStorageService } from '../services/thesis-work-storage.service';
import { ThesisWorkAdvanceService } from '../services/thesis-work-advance.service';
import { ThesisWorkDeliveryService } from '../services/thesis-work-delivery.service';
import { ThesisWorkEvaluationService } from '../services/thesis-work-evaluation.service';
import { ThesisWorkSpecialRequestService } from '../services/thesis-work-special-request.service';
import { ThesisWorkSustentationService } from '../services/thesis-work-sustentation.service';
import { ThesisWorkApiService } from '../services/thesis-work-api.service';
import { PreliminaryDraftStorageService } from '../../preliminary-draft/services/preliminary-draft-storage.service';
import { ProposalStorageService } from '../../proposal/services/proposal-storage.service';
import { UserService } from '../../users/services/user.service';
import { UserStorageService } from '../../users/services/user-storage.service';
import { UserApiService } from '../../users/services/user-api.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { NotificationService } from '../../../shared/components/notifications/services/notification.service';

import { ThesisWork } from '../interfaces/thesis-work.interface';
import { User } from '../../users/interfaces/user.interface';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { Modality } from '../../proposal/enums/modality.enum';
import { Proposal } from '../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-default', idType: IdentificationType.CC, idNumber: 123456789,
  firstName: 'Nombre', lastName: 'Apellido', secondLastName: '',
  codeNumber: 1234567890, email: 'test@test.com', password: 'hash',
  state: UserState.active, roles: [], ...overrides
});

describe('Integración [Trabajo de Grado]: Ciclo de Correcciones — subida y evaluación por jurado', () => {
  let uploadFacade: RegisterCorrectedDocumentsFacadeService;
  let evaluateFacade: EvaluateCorrectionsFacadeService;
  let thesisStorage: ThesisWorkStorageService;

  const thesisId = 'thesis-corr-cycle-1';
  const jurorId = 'juror-corr-cycle-1';
  const directorId = 'dir-corr-cycle-1';

  function seedThesisWork(): ThesisWork {
    const director = createMockUser({ id: directorId, firstName: 'Director' });
    const juror = createMockUser({ id: jurorId, firstName: 'Jurado' });
    const proposal: Proposal = {
      id: 'prop-corr-cycle-1', title: 'Tesis con correcciones', description: 'desc', modality: Modality.TI,
      authors: [], director, state: stateList.APROBADO, createdAt: new Date(),
      documents: [], evaluations: [], isArchived: false
    };
    const draft: PreliminaryDraft = {
      preliminaryDraftId: 'draft-corr-cycle-1', proposalId: proposal.id!, proposalData: proposal,
      evaluators: [], evaluations: [], documents: [],
      state: stateList.APROBADO, createdData: new Date(), isArchived: false
    };
    return {
      thesisWorkId: thesisId, preliminaryDraftId: draft.preliminaryDraftId!, preliminaryDraftData: draft,
      createdDate: new Date(), state: stateList.APLAZADO,
      advances: [], evaluations: [], finalDeliveries: [], documents: [],
      sustentations: [{ id: 'sust-corr-cycle-1', assignedJurors: [juror], verdicts: [] }],
      pazYSalvos: [], specialRequests: [], isArchived: false
    };
  }

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        RegisterCorrectedDocumentsFacadeService,
        EvaluateCorrectionsFacadeService,
        ThesisWorkService, ThesisWorkStorageService, ThesisWorkAdvanceService,
        ThesisWorkDeliveryService, ThesisWorkEvaluationService,
        ThesisWorkSpecialRequestService, ThesisWorkSustentationService, ThesisWorkApiService,
        PreliminaryDraftStorageService, ProposalStorageService,
        UserService, UserStorageService, UserApiService,
        EventBusService,
        { provide: AuthService, useValue: { currentUser: () => ({ id: jurorId }), hasAnyRole: () => false } },
        { provide: NotificationService, useValue: { show: jest.fn() } }
      ]
    });

    uploadFacade = TestBed.inject(RegisterCorrectedDocumentsFacadeService);
    evaluateFacade = TestBed.inject(EvaluateCorrectionsFacadeService);
    thesisStorage = TestBed.inject(ThesisWorkStorageService);
    const injector = TestBed.inject(Injector);
    await waitForHydration(thesisStorage.isHydrated, injector);

    thesisStorage['_thesisWorksList'].set([seedThesisWork()]);
  });

  it('debe registrar la corrección subida y luego la evaluación aprobatoria, con signedDocuments como FormattedDocument[]', async () => {
    const monograph = new File(['contenido monografía'], 'monografia-corregida.pdf', { type: 'application/pdf' });
    const annexes = new File(['contenido anexos'], 'anexos-corregidos.pdf', { type: 'application/pdf' });

    await new Promise<void>(resolve => {
      uploadFacade.processCorrectedDocuments(thesisId, { monograph, annexes }, () => resolve(), () => resolve());
    });

    const afterUpload = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    expect(afterUpload?.state).toBe(stateList.EN_REVISION);
    expect(afterUpload?.correctedDeliveries).toHaveLength(1);
    // A diferencia de los avances, las correcciones SÍ se reflejan en
    // documents[] plano además de en correctedDeliveries[].
    expect(afterUpload?.documents.some(d => d.type === DocumentType.CORRECCION)).toBe(true);
    expect(afterUpload?.correctedDeliveries?.[0].monograph.url).toMatch(/^data:/);

    const formatoG = new File(['contenido acta'], 'formato-g.pdf', { type: 'application/pdf' });

    await new Promise<void>(resolve => {
      evaluateFacade.saveEvaluation(
        thesisId,
        {
          proposalId: 'prop-corr-cycle-1',
          documentId: afterUpload!.correctedDeliveries![0].monograph.id,
          evaluatorId: jurorId,
          evaluatorName: 'Jurado de prueba',
          evaluatorRole: 'JURADO',
          veredict: stateList.APROBADO,
          observations: 'Correcciones aplicadas satisfactoriamente'
        },
        formatoG,
        () => resolve(),
        () => resolve()
      );
    });

    const afterEvaluation = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);

    // El estado final tras aprobar correcciones es APROBADO_CON_OBSERVACIONES,
    // no simplemente APROBADO — regla de negocio específica de esta rama.
    expect(afterEvaluation?.state).toBe(stateList.APROBADO_CON_OBSERVACIONES);
    expect(afterEvaluation?.correctedDeliveries?.[0].status).toBe(stateList.APROBADO);
    expect(afterEvaluation?.correctedDeliveries?.[0].monograph.status).toBe(stateList.APROBADO);

    const verdicts = afterEvaluation?.sustentations?.[0].verdicts;
    expect(verdicts).toHaveLength(1);
    expect(verdicts?.[0].jurorId).toBe(jurorId);
    expect(verdicts?.[0].veredict).toBe(stateList.APROBADO);

    // CRÍTICO: la evaluación se guarda con signedDocuments como
    // FormattedDocument[] real — no el antiguo string[] que rompía la
    // interfaz Evaluation.
    const newEvaluation = afterEvaluation?.evaluations[0];
    expect(newEvaluation?.signedDocuments).toHaveLength(1);
    expect(newEvaluation?.signedDocuments?.[0].name).toBe('formato-g.pdf');
    expect(newEvaluation?.signedDocuments?.[0].url).toMatch(/^data:/);
  }, 10000);

  it('debe dejar el trabajo en APLAZADO si el jurado no aprueba las correcciones', async () => {
    const monograph = new File(['contenido'], 'monografia.pdf', { type: 'application/pdf' });
    const annexes = new File(['contenido'], 'anexos.pdf', { type: 'application/pdf' });

    await new Promise<void>(resolve => {
      uploadFacade.processCorrectedDocuments(thesisId, { monograph, annexes }, () => resolve(), () => resolve());
    });

    const afterUpload = thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId);
    const formatoG = new File(['contenido'], 'formato-g-rechazo.pdf', { type: 'application/pdf' });

    await new Promise<void>(resolve => {
      evaluateFacade.saveEvaluation(
        thesisId,
        {
          proposalId: 'prop-corr-cycle-1',
          documentId: afterUpload!.correctedDeliveries![0].monograph.id,
          evaluatorId: jurorId,
          evaluatorName: 'Jurado de prueba',
          evaluatorRole: 'JURADO',
          veredict: stateList.NO_APROBADO,
          observations: 'Persisten fallas metodológicas graves'
        },
        formatoG,
        () => resolve(),
        () => resolve()
      );
    });

    expect(thesisStorage.allThesisWorks().find(w => w.thesisWorkId === thesisId)?.state).toBe(stateList.APLAZADO);
  }, 10000);
});
