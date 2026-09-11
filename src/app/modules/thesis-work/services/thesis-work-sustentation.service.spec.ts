import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { of, throwError } from 'rxjs';

// 1. MOCKEAR LAS FUNCIONES EXTERNAS ANTES DE IMPORTAR EL SERVICIO
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

// Importamos SustentationVeredict para tipar correctamente los payloads
import { ThesisWorkSustentationService, SustentationVeredict } from './thesis-work-sustentation.service';
import { ThesisWorkStorageService } from './thesis-work-storage.service';
import { UserService } from '../../users/services/user.service';
import { AuthService } from '../../../core/services/auth/auth.service';
import { EventBusService } from '../../../core/services/eventbus/event-bus.service';

import { AppEventType } from '../../../core/enums/app-event-type.enum';
import { stateList } from '../../../core/enums/state.enum';
import { UserRoleType } from '../../../core/enums/user-role-type.enum';
import { DocumentType } from '../../../core/enums/document-type.enum';
import { User } from '../../users/interfaces/user.interface';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { SustentationFormData } from '../interfaces/sustentation-form-data.interface';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { IdentificationType } from '../../users/enum/identification-type.enum';
import { UserState } from '../../users/enum/user-state.enum';
import { PreliminaryDraft } from '../../preliminary-draft/interfaces/preliminary-draft.interface';

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────

interface MockUserService {
  addRoleToUser: jest.Mock;
  users: WritableSignal<User[]>;
  removeRolesFromUsersMock: jest.Mock;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

interface MockThesisWorkStorageService {
  updateWork: jest.Mock;
}

interface MockEventBusService {
  emit: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas (Adiós "any") ──────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'thesis-1',
  preliminaryDraftId: 'draft-1',
  state: stateList.EN_DESARROLLO,
  createdDate: new Date(),
  isArchived: false,
  documents: [{ id: 'doc-1', name: 'doc', url: 'url', type: DocumentType.FORMATO_E, uploadDate: new Date(), status: stateList.EN_REVISION }],
  sustentations: [{ id: 'sust-1', assignedJurors: [createMockUser({ id: 'juror-1' })], verdicts: [] }],
  correctedDeliveries: [],
  preliminaryDraftData: {
    preliminaryDraftId: 'draft-1',
    proposalId: 'prop-1',
    state: stateList.APROBADO,
    createdData: new Date(),
    evaluators: [createMockUser({ id: 'eval-1' })],
    proposalData: { title: 'Título de Prueba' } as any
  } as PreliminaryDraft,
  ...overrides
} as ThesisWork);

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ThesisWorkSustentationService', () => {
  let service: ThesisWorkSustentationService;

  let storageSpy: MockThesisWorkStorageService;
  let userSpy: MockUserService;
  let authSpy: MockAuthService;
  let eventBusSpy: MockEventBusService;
  let removeRolesSpy: jest.Mock;

  let mutableMockThesis: ThesisWork;

  beforeEach(() => {
    // 🔕 Silenciar ruidos en la terminal
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mutableMockThesis = createMockThesisWork();

    storageSpy = {
      updateWork: jest.fn().mockImplementation((id: string, mutator: (work: ThesisWork) => ThesisWork) => {
        mutableMockThesis = mutator(mutableMockThesis);
      })
    };

    removeRolesSpy = jest.fn().mockReturnValue(of(undefined));

    userSpy = {
      addRoleToUser: jest.fn().mockReturnValue(of(undefined)),
      users: signal([
        createMockUser({ id: 'juror-1' }),
        createMockUser({ id: 'juror-2' }),
        createMockUser({ id: 'consejo-1', roles: [UserRoleType.CONSEJO] })
      ]),
      removeRolesFromUsersMock: removeRolesSpy
    };

    authSpy = {
      currentUser: signal(createMockUser({ id: 'juror-1' }))
    };

    eventBusSpy = {
      emit: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [
        ThesisWorkSustentationService,
        { provide: ThesisWorkStorageService, useValue: storageSpy },
        { provide: UserService, useValue: userSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: EventBusService, useValue: eventBusSpy }
      ]
    });

    service = TestBed.inject(ThesisWorkSustentationService);

    // Configuración base de mocks globales
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
      const formData: SustentationFormData = {
        formatEDocument: mockFile,
        juror1: 'juror-1',
        juror2: 'juror-2',
        sustentationDate: '2026-09-01',
        sustentationTime: '10:00',
        location: 'Auditorio'
      };

      // FIX: Puenteamos el agujero negro de native async/await en Zone.js
      // espiando estrictamente el método interno sin usar "any".
      interface FileDocumentMock {
        id: string;
        name: string;
        url: string;
        uploadDate: string;
        type: DocumentType;
        status: stateList;
      }

      const serviceExposed = service as unknown as {
        buildSustentationFormatEDocument: (file: unknown, dateStr: string) => Promise<FileDocumentMock>
      };

      jest.spyOn(serviceExposed, 'buildSustentationFormatEDocument').mockResolvedValue({
        id: 'mock-doc-id',
        name: 'formatoE.pdf',
        url: 'data:application/pdf;base64,mockFile',
        uploadDate: '2026-08-19',
        type: DocumentType.FORMATO_E,
        status: stateList.EN_REVISION
      });

      let completed = false;

      service.saveSustentationRegistryMock('thesis-1', formData).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      // El tick procesará instantáneamente el flujo RxJS ahora que la promesa no se pierde
      flushMicrotasks();
      tick(1000);

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

      const payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date } = {
        veredict: stateList.APROBADO,
        observations: 'Excelente',
        evaluationDate: new Date()
      };

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);

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

      const payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date } = {
        veredict: stateList.NO_APROBADO,
        observations: 'Debe repetir',
        evaluationDate: new Date()
      };

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);

      expect(completed).toBe(true);
      expect(removeRolesSpy).toHaveBeenCalledTimes(2);
      expect(removeRolesSpy).toHaveBeenCalledWith(['eval-1'], [UserRoleType.EVALUADOR]);
      expect(removeRolesSpy).toHaveBeenCalledWith(['juror-1'], [UserRoleType.JURADO]);
    }));

    it('debe capturar el error si la limpieza de roles falla, sin romper el flujo principal', fakeAsync(() => {
      const mockFile = new File([''], 'veredicto_malo.pdf');

      const payload: { veredict: SustentationVeredict; observations: string; evaluationDate: Date } = {
        veredict: stateList.NO_APROBADO,
        observations: 'Falla red',
        evaluationDate: new Date()
      };

      removeRolesSpy.mockReturnValue(throwError(() => new Error('Error de red')));

      let completed = false;
      service.registerSustentationVerdictMock('thesis-1', payload, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1000);

      expect(completed).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        'Error al limpiar roles tras el veredicto de sustentación:',
        expect.any(Error)
      );
    }));
  });

  describe('evaluateCorrectedDocumentsMock', () => {
    it('debe actualizar documentos corregidos, asignar estado final y emitir evento', fakeAsync(() => {
      const mockFile = new File([''], 'formatoG.pdf', { type: 'application/pdf' });

      const payload: Omit<Evaluation, 'id' | 'date'> = {
        proposalId: 'prop-1',
        evaluatorId: 'juror-1',
        evaluatorName: 'Nombre Jurado',
        evaluatorRole: UserRoleType.JURADO,
        veredict: stateList.APROBADO,
        observations: 'Correcciones aceptadas'
      };

      let completed = false;
      service.evaluateCorrectedDocumentsMock('thesis-1', payload, mockFile).subscribe({
        next: () => completed = true,
        error: (err) => { throw err; }
      });

      flushMicrotasks();
      tick(1200);

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
