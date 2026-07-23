import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ProposalDocumentService } from './proposal-document.service';
import { ProposalStorageService } from './proposal-storage.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';
import { UserService } from '../../users/services/user.service';

import { Proposal } from '../interfaces/proposal.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { User } from '../../users/interfaces/user.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';

// --- Constantes de Apoyo para Tipado Estricto ---
const mockBaseUser: User = {
  id: 'default-id',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Nombre',
  lastName: 'Apellido1',
  secondLastName: 'Apellido2',
  codeNumber: 102030,
  roles: [],
  email: 'test@unicauca.edu.co',
  password: 'hashedpassword',
  state: UserState.active
};

const createMockEvaluation = (veredict: stateList, overrides?: Partial<Evaluation>): Evaluation => ({
  id: 'eval-uuid',
  proposalId: 'prop-uuid',
  evaluatorId: 'doc-123',
  evaluatorName: 'Docente Evaluador',
  evaluatorRole: 'Evaluador Externo',
  veredict,
  observations: 'Sin observaciones',
  date: new Date(),
  ...overrides
});

describe('ProposalDocumentService', () => {
  let service: ProposalDocumentService;

  let mockStorageService: jest.Mocked<ProposalStorageService>;
  let mockEventBusService: jest.Mocked<EventBusService>;
  let mockUserService: jest.Mocked<UserService>;

  beforeEach(() => {
    Object.defineProperty(window, 'crypto', {
      value: { randomUUID: jest.fn().mockReturnValue('mock-uuid-document') }
    });

    mockStorageService = {
      getProposalsListSnapshot: jest.fn(),
      updateProposals: jest.fn()
    } as unknown as jest.Mocked<ProposalStorageService>;

    mockEventBusService = {
      emit: jest.fn()
    } as unknown as jest.Mocked<EventBusService>;

    mockUserService = {
      users: signal([{ ...mockBaseUser, id: 'miembro-comite-1', roles: [UserRoleType.COMITE] }])
    } as unknown as jest.Mocked<UserService>;

    TestBed.configureTestingModule({
      providers: [
        ProposalDocumentService,
        { provide: ProposalStorageService, useValue: mockStorageService },
        { provide: EventBusService, useValue: mockEventBusService },
        { provide: UserService, useValue: mockUserService }
      ]
    });

    service = TestBed.inject(ProposalDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('addEvaluationMock', () => {
    it('debería arrojar error si la propuesta no es encontrada', () => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([]);
      const evaluation = createMockEvaluation(stateList.APROBADO);

      expect(() => service.addEvaluationMock('99', evaluation))
        .toThrow('Propuesta con ID 99 no encontrada');
    });

    it('debería guardar evaluación A TIEMPO, actualizar documento y notificar', fakeAsync(() => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockProposal: Proposal = {
        id: '1',
        title: 'Sistema AI',
        evaluationDeadline: futureDate,
        authors: [{ ...mockBaseUser, id: 'estudiante-1' }],
        director: { ...mockBaseUser, id: 'director-1' },
        documents: [{ id: 'doc-1', status: stateList.EN_REVISION } as FileDocument]
      } as Proposal;

      mockStorageService.getProposalsListSnapshot.mockReturnValue([mockProposal]);

      const evaluation = createMockEvaluation(stateList.APROBADO_CON_OBSERVACIONES, {
        observations: 'Faltan referencias'
      });

      let resultProp: Proposal | undefined;
      service.addEvaluationMock('1', evaluation).subscribe(res => resultProp = res);

      tick(1000);

      expect(resultProp?.state).toBe(stateList.APROBADO_CON_OBSERVACIONES);
      const newEval = resultProp?.evaluations?.[0];
      expect(newEval?.id).toBe('mock-uuid-document');
      expect(newEval?.deadlineStatus).toBe(EvaluationDeadlineStatus.ON_TIME);
      expect(resultProp?.documents?.[0].status).toBe(stateList.APROBADO_CON_OBSERVACIONES);

      expect(mockStorageService.updateProposals).toHaveBeenCalled();

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.EVALUATION_ASSIGNED,
          payload: expect.objectContaining({ proposalId: '1', veredict: stateList.APROBADO_CON_OBSERVACIONES })
        })
      );

      const notifiedUsers = mockEventBusService.emit.mock.calls[0][0].targetUserIds;
      expect(notifiedUsers).toContain('estudiante-1');
      expect(notifiedUsers).toContain('director-1');
      expect(notifiedUsers).not.toContain('miembro-comite-1');
    }));

    it('debería guardar evaluación RETRASADA si se pasó del deadline', fakeAsync(() => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      const mockProposal: Proposal = {
        id: '2',
        evaluationDeadline: pastDate,
      } as Proposal;

      mockStorageService.getProposalsListSnapshot.mockReturnValue([mockProposal]);

      const evaluation = createMockEvaluation(stateList.NO_APROBADO);

      let resultProp: Proposal | undefined;
      service.addEvaluationMock('2', evaluation).subscribe(res => resultProp = res);

      tick(1000);

      expect(resultProp?.evaluations?.[0].deadlineStatus).toBe(EvaluationDeadlineStatus.DELAYED);
    }));
  });

  describe('uploadCorrectionMock', () => {
    it('debería arrojar error si la propuesta no es encontrada', () => {
      mockStorageService.getProposalsListSnapshot.mockReturnValue([]);
      const newDoc = { id: 'test-doc' } as FileDocument;

      expect(() => service.uploadCorrectionMock('99', newDoc))
        .toThrow('Propuesta con ID 99 no encontrada');
    });

    it('debería agregar documento, cambiar estado a EN_REVISION, extender fecha y notificar al comité', fakeAsync(() => {
      const mockProposal: Proposal = {
        id: '1',
        title: 'Correcciones Finales',
        state: stateList.APROBADO_CON_OBSERVACIONES,
        authors: [{ ...mockBaseUser, id: 'estudiante-1' }],
        documents: [{ id: 'doc-viejo' } as FileDocument]
      } as Proposal;

      mockStorageService.getProposalsListSnapshot.mockReturnValue([mockProposal]);

      const newDoc = { id: 'doc-nuevo', name: 'v2.pdf' } as FileDocument;
      let resultProp: Proposal | undefined;

      service.uploadCorrectionMock('1', newDoc).subscribe(res => resultProp = res);

      tick(1200);

      expect(resultProp?.state).toBe(stateList.EN_REVISION);
      expect(resultProp?.documents?.length).toBe(2);
      expect(resultProp?.documents?.[0].id).toBe('doc-nuevo');
      expect(resultProp?.evaluationDeadline).toBeDefined();

      expect(mockStorageService.updateProposals).toHaveBeenCalled();

      const emitCallArgs = mockEventBusService.emit.mock.calls[0][0];
      expect(emitCallArgs.type).toBe(AppEventType.PROPOSAL_CORRECTION_UPLOADED);

      const notifiedUsers = emitCallArgs.targetUserIds;
      expect(notifiedUsers).toContain('estudiante-1');
      expect(notifiedUsers).toContain('miembro-comite-1');
    }));
  });
});
