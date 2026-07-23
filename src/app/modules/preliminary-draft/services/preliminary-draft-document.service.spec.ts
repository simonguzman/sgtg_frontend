import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';

import { PreliminaryDraftDocumentService } from './preliminary-draft-document.service';
import { PreliminaryDraftStorageService } from './preliminary-draft-storage.service';
import { UserService } from '../../users/services/user.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { FileDocument } from '../../../core/interfaces/file-document.interface';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';

describe('PreliminaryDraftDocumentService', () => {
  let service: PreliminaryDraftDocumentService;

  let mockStorageService: jest.Mocked<PreliminaryDraftStorageService>;
  let mockUserService: jest.Mocked<UserService>;
  let mockEventBusService: jest.Mocked<EventBusService>;

  beforeEach(() => {
    mockStorageService = {
      updateDraft: jest.fn()
    } as unknown as jest.Mocked<PreliminaryDraftStorageService>;

    mockUserService = {
      users: signal([
        { id: 'jefe-1', roles: [UserRoleType.JEFE_DEP] },
        { id: 'consejo-1', roles: [UserRoleType.CONSEJO] }
      ])
    } as unknown as jest.Mocked<UserService>;

    mockEventBusService = {
      emit: jest.fn()
    } as unknown as jest.Mocked<EventBusService>;

    TestBed.configureTestingModule({
      providers: [
        PreliminaryDraftDocumentService,
        { provide: PreliminaryDraftStorageService, useValue: mockStorageService },
        { provide: UserService, useValue: mockUserService },
        { provide: EventBusService, useValue: mockEventBusService }
      ]
    });

    service = TestBed.inject(PreliminaryDraftDocumentService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  describe('calculateDocumentStatus', () => {
    it('debería retornar EN_REVISION si no hay evaluadores', () => {
      expect(service.calculateDocumentStatus('doc-1', [], 0)).toBe(stateList.EN_REVISION);
    });

    it('debería retornar EN_REVISION si faltan evaluaciones', () => {
      const evals = [{ documentId: 'doc-1', veredict: stateList.APROBADO }] as Evaluation[];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.EN_REVISION);
    });

    it('debería retornar NO_APROBADO si al menos una evaluación es NO_APROBADO', () => {
      const evals = [
        { documentId: 'doc-1', veredict: stateList.APROBADO },
        { documentId: 'doc-1', veredict: stateList.NO_APROBADO }
      ] as Evaluation[];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.NO_APROBADO);
    });

    it('debería retornar APROBADO si todas las evaluaciones son APROBADO', () => {
      const evals = [
        { documentId: 'doc-1', veredict: stateList.APROBADO },
        { documentId: 'doc-1', veredict: stateList.APROBADO }
      ] as Evaluation[];
      expect(service.calculateDocumentStatus('doc-1', evals, 2)).toBe(stateList.APROBADO);
    });
  });

  describe('addEvaluationMock', () => {
    it('debería añadir evaluación, clasificar el status (ON_TIME) y notificar', fakeAsync(() => {
      const mockEvaluation = { veredict: stateList.APROBADO } as Evaluation;

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);

      const mockDraft = {
        proposalData: { title: 'Tesis', authors: ['author-1'] },
        evaluationDeadline: futureDate,
        evaluations: []
      } as unknown as PreliminaryDraft;

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id, cb) => {
        finalDraft = cb(mockDraft);
      });

      service.addEvaluationMock('1', mockEvaluation).subscribe();
      tick(1000);

      // Verificamos que se calculó como A TIEMPO
      expect(finalDraft?.evaluations?.[0].deadlineStatus).toBe(EvaluationDeadlineStatus.ON_TIME);

      // Verificamos notificación
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_EVALUATION_REGISTERED,
          targetUserIds: expect.arrayContaining(['author-1', 'jefe-1'])
        })
      );
    }));
  });

  describe('uploadDocumentMock', () => {
    it('debería subir CORRECCION, actualizar deadline y notificar evaluadores', fakeAsync(() => {
      const document = { type: DocumentType.CORRECCION } as FileDocument;
      const mockDraft = {
        proposalData: { title: 'Correcciones', authors: ['auth-1'], director: { id: 'dir-1' } },
        evaluators: [{ id: 'eval-1' }],
        documents: []
      } as unknown as PreliminaryDraft;

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id, cb) => {
        finalDraft = cb(mockDraft);
      });

      service.uploadDocumentMock('1', document).subscribe();
      tick(1000);

      expect(finalDraft?.evaluationDeadline).toBeDefined(); // Se debió agregar +10 días
      expect(finalDraft?.documents?.[0]).toEqual(document);

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_CORRECTION_UPLOADED,
          targetUserIds: expect.arrayContaining(['eval-1', 'dir-1'])
        })
      );
    }));

    it('debería subir FORMATO_C, limpiar deadline y notificar a consejo/jefes', fakeAsync(() => {
      const document = { type: DocumentType.FORMATO_C } as FileDocument;
      const mockDraft = {
        proposalData: { title: 'Presentacion', authors: ['auth-1'] }
      } as unknown as PreliminaryDraft;

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id, cb) => {
        finalDraft = cb(mockDraft);
      });

      service.uploadDocumentMock('1', document).subscribe();
      tick(1000);

      expect(finalDraft?.evaluationDeadline).toBeUndefined(); // Se debió limpiar

      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.PRELIMINARY_DRAFT_COUNCIL_PRESENTATION_UPLOADED,
          targetUserIds: expect.arrayContaining(['auth-1', 'jefe-1', 'consejo-1'])
        })
      );
    }));
  });

  describe('uploadCouncilResolutionMock', () => {
    it('debería registrar resolución, actualizar estado y setear maximumDeliveryDate si es APROBADO', fakeAsync(() => {
      const document = { id: 'doc-resolucion' } as FileDocument;
      const evaluation = { veredict: stateList.APROBADO } as Evaluation;
      const maxDate = new Date('2024-12-31');

      const mockDraft = {
        proposalData: { title: 'Resolucion', authors: ['auth-1'] },
        documents: [],
        evaluations: []
      } as unknown as PreliminaryDraft;

      let finalDraft: PreliminaryDraft | undefined;
      mockStorageService.updateDraft.mockImplementation((id, cb) => {
        finalDraft = cb(mockDraft);
      });

      let returnedDraft: PreliminaryDraft | undefined;
      service.uploadCouncilResolutionMock('1', document, stateList.APROBADO, evaluation, maxDate)
        .subscribe(res => returnedDraft = res);

      tick(1000);

      // Verificamos cambios en el Draft
      expect(finalDraft?.state).toBe(stateList.APROBADO);
      expect(finalDraft?.maximumDeliveryDate).toBe(maxDate);
      expect(finalDraft?.documents).toContain(document);
      expect(finalDraft?.evaluations).toContain(evaluation);

      // Verificamos que el map devolvió el draft actualizado
      expect(returnedDraft).toEqual(finalDraft);

      // Verificamos evento emitido
      expect(mockEventBusService.emit).toHaveBeenCalledWith(
        expect.objectContaining({
          type: AppEventType.COUNCIL_RESOLUTION_UPLOADED,
          targetUserIds: expect.arrayContaining(['auth-1', 'jefe-1', 'consejo-1']),
          payload: expect.objectContaining({ finalState: stateList.APROBADO })
        })
      );
    }));
  });
});
