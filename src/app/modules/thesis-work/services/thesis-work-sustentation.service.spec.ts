import { TestBed, fakeAsync, flush, flushMicrotasks, tick } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';

import { ThesisWorkSustentationService } from './thesis-work-sustentation.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';

// 1. MOCKEAR LAS FUNCIONES EXTERNAS
jest.mock('../../../core/utils/file-reader.utils', () => ({
  readFileAsDataUrl: jest.fn()
}));
jest.mock('../helpers/thesis-date.helper', () => ({
  formatThesisDate: jest.fn()
}));
jest.mock('../helpers/thesis-participants.helper', () => ({
  collectParticipantIds: jest.fn()
}));

import { readFileAsDataUrl } from '../../../core/utils/file-reader.utils';
import { formatThesisDate } from '../helpers/thesis-date.helper';
import { collectParticipantIds } from '../helpers/thesis-participants.helper';

describe('ThesisWorkSustentationService', () => {
  let service: ThesisWorkSustentationService;

  // 🔹 REFACTOR: Interfaces estrictas en lugar de 'any' para los espías
  let storageSpy: { updateWork: jest.Mock };
  let userSpy: {
    addRoleToUser: jest.Mock;
    users: WritableSignal<Array<{ id: string; roles: UserRoleType[] }>>;
    removeRolesFromUsersMock: jest.Mock;
  };
  let authSpy: { currentUser: WritableSignal<{ id: string }> };
  let eventBusSpy: { emit: jest.Mock };
  let removeRolesSpy: jest.Mock;

  const getMockThesisBase = () => ({
    thesisWorkId: 'thesis-1',
    preliminaryDraftData: {
      proposalData: { title: 'Título de Prueba' },
      evaluators: [{ id: 'eval-1' }]
    },
    sustentations: [{
      id: 'sust-1',
      assignedJurors: [{ id: 'juror-1' }],
      verdicts: []
    }],
    documents: [{ type: DocumentType.FORMATO_E, status: stateList.EN_REVISION }],
    correctedDeliveries: [{ status: 'PENDIENTE', monograph: { status: 'PENDIENTE' } }]
  });

  beforeEach(() => {
    storageSpy = {
      // 🔹 REFACTOR: Tipado para el callback en lugar de 'updateCb: any'
      updateWork: jest.fn().mockImplementation((id: string, updateCb: (work: unknown) => unknown) => {
        const mockThesis = getMockThesisBase();
        const result = typeof updateCb === 'function' ? updateCb(mockThesis) : mockThesis;
        return of(result);
      })
    };

    removeRolesSpy = jest.fn().mockReturnValue(of(undefined));

    userSpy = {
      addRoleToUser: jest.fn().mockReturnValue(of(undefined)),
      users: signal([
        { id: 'juror-1', roles: [] },
        { id: 'juror-2', roles: [] },
        { id: 'consejo-1', roles: [UserRoleType.CONSEJO] }
      ]),
      removeRolesFromUsersMock: removeRolesSpy
    };

    authSpy = {
      currentUser: signal({ id: 'juror-1' })
    };

    eventBusSpy = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkSustentationService,
        { provide: ThesisWorkStorageService, useValue: storageSpy as unknown as ThesisWorkStorageService },
        { provide: UserService, useValue: userSpy as unknown as UserService },
        { provide: AuthService, useValue: authSpy as unknown as AuthService },
        { provide: EventBusService, useValue: eventBusSpy as unknown as EventBusService }
      ]
    });

    service = TestBed.inject(ThesisWorkSustentationService);

    (readFileAsDataUrl as jest.Mock).mockResolvedValue('data:application/pdf;base64,mockFile');
    (formatThesisDate as jest.Mock).mockReturnValue('2026-08-19');
    (collectParticipantIds as jest.Mock).mockReturnValue(['student-1']);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('saveSustentationRegistryMock', () => {
    it('debe construir el documento, asignar roles a jurados, actualizar storage y emitir evento', fakeAsync(() => {
      const mockFile = new File([''], 'formatoE.pdf', { type: 'application/pdf' });
      const formData = {
        formatEDocument: mockFile,
        juror1: 'juror-1',
        juror2: 'juror-2',
        sustentationDate: '2026-09-01',
        sustentationTime: '10:00',
        location: 'Auditorio'
      };

      // 🔹 REFACTOR: Definimos exactamente la estructura que devuelve la promesa
      type DocumentReturnType = {
        id: string;
        name: string;
        url: string;
        uploadDate: string;
        type: DocumentType;
        status: stateList;
      };

      // 🔹 REFACTOR: Casteamos el servicio a un objeto anónimo sin usar '&' para evitar colisión a 'never'
      const serviceWithExposedMethod = service as unknown as {
        buildSustentationFormatEDocument: () => Promise<DocumentReturnType>;
      };

      // Usamos mockResolvedValue, que es más limpio que mockReturnValue(Promise.resolve(...))
      jest.spyOn(serviceWithExposedMethod, 'buildSustentationFormatEDocument').mockResolvedValue({
        id: 'mock-doc-id',
        name: 'formatoE.pdf',
        url: 'data:application/pdf;base64,mockFile',
        uploadDate: '2026-08-19',
        type: DocumentType.FORMATO_E,
        status: stateList.EN_REVISION
      });

      let completed = false;

      // 🔹 REFACTOR: Obtener automáticamente el tipo de los parámetros de la función original
      type SaveSustentationParams = Parameters<typeof service.saveSustentationRegistryMock>[1];

      service.saveSustentationRegistryMock('thesis-1', formData as unknown as SaveSustentationParams).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);
      flush();

      expect(completed).toBe(true);
      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('juror-1', UserRoleType.JURADO);
      expect(userSpy.addRoleToUser).toHaveBeenCalledWith('juror-2', UserRoleType.JURADO);
      expect(storageSpy.updateWork).toHaveBeenCalledWith('thesis-1', expect.any(Function));

      expect(eventBusSpy.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.THESIS_SUSTENTATION_PROGRAMMED,
        targetUserIds: expect.arrayContaining(['student-1', 'juror-1', 'juror-2'])
      }));
    }));
  });

  describe('registerSustentationVerdictMock', () => {
    it('debe registrar el veredicto (APROBADO), actualizar storage y no limpiar roles', fakeAsync(() => {
      const mockFile = new File([''], 'veredicto.pdf', { type: 'application/pdf' });
      const payload = {
        veredict: stateList.APROBADO, // 🔹 REFACTOR: Sin 'as any'
        observations: 'Excelente',
        evaluationDate: new Date(),
        proposalId: 'thesis-1',
        evaluatorId: 'juror-1',
        evaluatorName: 'Nombre Jurado',
        evaluatorRole: UserRoleType.JURADO
      };

      type VerdictPayloadType = Parameters<typeof service.registerSustentationVerdictMock>[1];

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload as unknown as VerdictPayloadType, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);
      flush();

      expect(completed).toBe(true);
      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(storageSpy.updateWork).toHaveBeenCalled();
      expect(eventBusSpy.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.THESIS_VERDICT_REGISTERED,
        payload: expect.objectContaining({ veredict: stateList.APROBADO })
      }));
      expect(removeRolesSpy).not.toHaveBeenCalled();
    }));

    it('debe registrar veredicto (NO_APROBADO), archivar tesis y limpiar roles de jurados/evaluadores', fakeAsync(() => {
      const mockFile = new File([''], 'veredicto_malo.pdf');
      const payload = {
        veredict: stateList.NO_APROBADO, // 🔹 REFACTOR: Sin 'as any'
        observations: 'Debe repetir',
        evaluationDate: new Date(),
        proposalId: 'thesis-1',
        evaluatorId: 'juror-1',
        evaluatorName: 'Nombre Jurado',
        evaluatorRole: UserRoleType.JURADO
      };

      type VerdictPayloadType = Parameters<typeof service.registerSustentationVerdictMock>[1];

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload as unknown as VerdictPayloadType, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);
      flush();

      expect(completed).toBe(true);
      expect(removeRolesSpy).toHaveBeenCalledTimes(2);
      expect(removeRolesSpy).toHaveBeenCalledWith(['eval-1'], [UserRoleType.EVALUADOR]);
      expect(removeRolesSpy).toHaveBeenCalledWith(['juror-1'], [UserRoleType.JURADO]);
    }));

    it('debe capturar el error si removeRolesFromUsersMock falla, sin romper el flujo', fakeAsync(() => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockFile = new File([''], 'veredicto_malo.pdf');
      const payload = {
        veredict: stateList.NO_APROBADO, // 🔹 REFACTOR: Sin 'as any'
        observations: '',
        evaluationDate: new Date(),
        proposalId: 'thesis-1',
        evaluatorId: 'juror-1',
        evaluatorName: 'Nombre Jurado',
        evaluatorRole: UserRoleType.JURADO
      };

      type VerdictPayloadType = Parameters<typeof service.registerSustentationVerdictMock>[1];

      removeRolesSpy.mockReturnValue(throwError(() => new Error('Error de red')));

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload as unknown as VerdictPayloadType, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);
      flush();

      expect(completed).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error al limpiar roles tras el veredicto de sustentación:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    }));
  });

  describe('evaluateCorrectedDocumentsMock', () => {
    it('debe actualizar documentos corregidos, asignar estado final y emitir evento', fakeAsync(() => {
      const mockFile = new File([''], 'formatoG.pdf', { type: 'application/pdf' });
      const payload = {
        veredict: stateList.APROBADO, // 🔹 REFACTOR: Sin 'as any'
        observations: 'Correcciones aceptadas',
        proposalId: 'thesis-1',
        evaluatorId: 'juror-1',
        evaluatorName: 'Nombre Jurado',
        evaluatorRole: UserRoleType.JURADO
      };

      type EvaluationPayloadType = Parameters<typeof service.evaluateCorrectedDocumentsMock>[1];

      let completed = false;
      service.evaluateCorrectedDocumentsMock('thesis-1', payload as unknown as EvaluationPayloadType, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1200);
      flush();

      expect(completed).toBe(true);
      expect(readFileAsDataUrl).toHaveBeenCalledWith(mockFile);
      expect(storageSpy.updateWork).toHaveBeenCalled();

      expect(eventBusSpy.emit).toHaveBeenCalledWith(expect.objectContaining({
        type: AppEventType.THESIS_CORRECTED_DOCUMENTS_EVALUATED,
        payload: expect.objectContaining({ veredict: stateList.APROBADO })
      }));
    }));
  });
});
