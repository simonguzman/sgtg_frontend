import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { PreliminaryDraftFormService } from './preliminary-draft-form.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { stateList } from '../../../../../core/enums/state.enum';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { Evaluation } from '../../../../../core/interfaces/evaluation.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u1',
  firstName: 'Juan',
  secondName: 'Carlos',
  lastName: 'Pérez',
  secondLastName: 'Gómez',
  roles: [],
  ...overrides
} as User);

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: 'eval-1',
  proposalId: 'p1',
  documentId: 'doc-1',
  evaluatorId: 'u2',
  evaluatorName: 'Evaluador Prueba',
  evaluatorRole: 'Evaluador',
  veredict: stateList.APROBADO,
  observations: '',
  signedDocuments: [],
  date: new Date(),
  ...overrides
} as Evaluation);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'p1',
  title: 'Propuesta de Prueba',
  description: 'Descripción de prueba',
  state: stateList.APROBADO,
  director: createMockUser(),
  evaluations: [],
  ...overrides
} as Proposal);

const createMockPreliminaryDraft = (overrides: Partial<PreliminaryDraft> = {}): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'p1',
  proposalData: createMockProposal(),
  documents: [],
  state: stateList.EN_REVISION,
  createdData: new Date(),
  evaluations: [],
  evaluators: [],
  isArchived: false,
  ...overrides
} as PreliminaryDraft);

describe('PreliminaryDraftFormService', () => {
  let service: PreliminaryDraftFormService;

  let mockProposalService: { proposals: WritableSignal<Proposal[]> };
  let mockAuthService: { currentUser: WritableSignal<User | null> };
  let mockPreliminaryDraftService: { preliminaryDrafts: WritableSignal<PreliminaryDraft[]> };
  let mockUserService: { getAuthorsNames: jest.Mock<string, [User[] | undefined]> };

  let currentUserSignal: WritableSignal<User | null>;
  let proposalsSignal: WritableSignal<Proposal[]>;
  let draftsSignal: WritableSignal<PreliminaryDraft[]>;

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    currentUserSignal = signal<User | null>(null);
    proposalsSignal = signal<Proposal[]>([]);
    draftsSignal = signal<PreliminaryDraft[]>([]);

    mockProposalService = { proposals: proposalsSignal };
    mockAuthService = { currentUser: currentUserSignal };
    mockPreliminaryDraftService = { preliminaryDrafts: draftsSignal };
    mockUserService = { getAuthorsNames: jest.fn().mockReturnValue('Autor de Prueba') };

    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        PreliminaryDraftFormService,
        { provide: ProposalService, useValue: mockProposalService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: PreliminaryDraftService, useValue: mockPreliminaryDraftService },
        { provide: UserService, useValue: mockUserService }
      ]
    });

    TestBed.runInInjectionContext(() => {
      service = TestBed.inject(PreliminaryDraftFormService);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('setupDynamicLogic y selectedProposal', () => {
    it('debería actualizar selectedProposalId cuando el formulario cambia y resolver la propuesta seleccionada', () => {
      const proposal = createMockProposal({ id: 'p99' });
      const mockUser = createMockUser({ id: 'u1' });

      proposal.director = mockUser;

      currentUserSignal.set(mockUser);
      proposalsSignal.set([proposal]);

      service.form.patchValue({ proposalId: 'p99' });

      expect(service.selectedProposalId()).toBe('p99');
      expect(service.selectedProposal()).toEqual(proposal);
    });
  });

  describe('availableProposals (Signal Computed)', () => {
    it('debería retornar solo propuestas aprobadas donde el usuario sea director y no tengan anteproyecto', () => {
      const mockUser = createMockUser({ id: 'u1' });
      currentUserSignal.set(mockUser);

      const proposals: Proposal[] = [
        createMockProposal({ id: 'p1', state: stateList.APROBADO, director: createMockUser({ id: 'u1' }) }),
        createMockProposal({ id: 'p2', state: stateList.EN_REVISION, director: createMockUser({ id: 'u1' }) }),
        createMockProposal({ id: 'p3', state: stateList.APROBADO, director: createMockUser({ id: 'u2' }) }),
        createMockProposal({ id: 'p4', state: stateList.APROBADO, director: createMockUser({ id: 'u1' }) })
      ];

      const drafts: PreliminaryDraft[] = [
        createMockPreliminaryDraft({ proposalId: 'p4' })
      ];

      proposalsSignal.set(proposals);
      draftsSignal.set(drafts);

      const result = service.availableProposals();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('debería incluir propuestas con estado APROBADO_CON_OBSERVACIONES', () => {
      const mockUser = createMockUser({ id: 'u1' });
      currentUserSignal.set(mockUser);

      const proposals: Proposal[] = [
        createMockProposal({ id: 'p1', state: stateList.APROBADO_CON_OBSERVACIONES, director: createMockUser({ id: 'u1' }) })
      ];

      proposalsSignal.set(proposals);
      const result = service.availableProposals();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });

    it('debería incluir siempre la propuesta asociada si estamos en modo edición (activeDraftId)', () => {
      const proposal = createMockProposal({ id: 'p-edit', title: 'Edición' });
      proposalsSignal.set([proposal]);

      service.currentPreliminaryDraftId.set('draft-1');
      service.form.patchValue({ proposalId: 'p-edit' });

      const result = service.availableProposals();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p-edit');
    });
  });

  describe('proposalOptions (Signal Computed)', () => {
    it('debería mapear correctamente las propuestas disponibles a SelectOption', () => {
      const mockUser = createMockUser({ id: 'u1' });
      currentUserSignal.set(mockUser);

      const validProposal = createMockProposal({ id: 'p1', title: 'Título Opciones', state: stateList.APROBADO, director: mockUser });
      proposalsSignal.set([validProposal]);

      const options = service.proposalOptions();
      expect(options).toEqual([{ id: 'p1', label: 'Título Opciones' }]);
    });
  });

  describe('proposalEvaluationDocument (Signal Computed)', () => {
    it('debería retornar null si la propuesta no tiene evaluaciones', () => {
      proposalsSignal.set([createMockProposal({ id: 'p1', evaluations: [] })]);
      currentUserSignal.set(createMockUser());
      service.form.patchValue({ proposalId: 'p1' });

      expect(service.proposalEvaluationDocument()).toBeNull();
    });

    it('debería retornar el primer documento firmado de la última evaluación aprobada', () => {
      const mockDocument = { name: 'evaluacion.pdf', url: 'data:...' } as FormattedDocument;
      const proposal = createMockProposal({
        id: 'p1',
        evaluations: [
          createMockEvaluation({ veredict: stateList.NO_APROBADO, signedDocuments: [] }),
          createMockEvaluation({ veredict: stateList.APROBADO, signedDocuments: [mockDocument] })
        ]
      });

      proposal.director = createMockUser({ id: 'u1' });
      proposalsSignal.set([proposal]);
      currentUserSignal.set(proposal.director);

      service.form.patchValue({ proposalId: 'p1' });

      expect(service.proposalEvaluationDocument()).toEqual(mockDocument);
    });

    it('debería retornar null si la última evaluación aprobada no tiene documentos firmados', () => {
      const proposal = createMockProposal({
        id: 'p1',
        evaluations: [
          createMockEvaluation({ veredict: stateList.APROBADO, signedDocuments: undefined })
        ]
      });

      proposal.director = createMockUser({ id: 'u1' });
      proposalsSignal.set([proposal]);
      currentUserSignal.set(proposal.director);
      service.form.patchValue({ proposalId: 'p1' });

      expect(service.proposalEvaluationDocument()).toBeNull();
    });
  });

  describe('Flujo de inicialización', () => {
    it('initForCreate debería limpiar el formulario y dejar los datos del proyecto solo de lectura', () => {
      service.initForCreate();
      expect(service.currentPreliminaryDraftId()).toBeNull();
      expect(service.form.get('title')?.disabled).toBeTruthy();
      expect(service.form.get('generalObjective')?.disabled).toBeTruthy();
      expect(service.form.get('description')?.disabled).toBeTruthy();
      expect(service.specificObjectives.length).toBe(0);
    });

    it('initForEdit carga los datos del proyecto para corregirlos, como en la propuesta', () => {
      const mockDraft = createMockPreliminaryDraft({
        preliminaryDraftId: 'draft-1',
        proposalId: 'p1',
        proposalData: createMockProposal({ title: 'Test', objectives: ['General', 'Específico 1', 'Específico 2'],
          description: 'Desc', lineOfResearch: 'IA' })
      });

      service.initForEdit(mockDraft);

      expect(service.currentPreliminaryDraftId()).toBe('draft-1');
      expect(service.form.get('proposalId')?.value).toBe('p1');
      expect(service.form.get('title')?.enabled).toBe(true);
      expect(service.form.getRawValue()).toEqual(expect.objectContaining({
        title: 'Test', generalObjective: 'General', specificObjectives: ['Específico 1', 'Específico 2'],
        description: 'Desc', lineOfResearch: 'IA'
      }));
    });

    it('initForEdit deja un objetivo específico vacío para agregar y no quita el último', () => {
      service.initForEdit(createMockPreliminaryDraft({ proposalData: createMockProposal({ objectives: ['General'] }) }));
      expect(service.specificObjectives.getRawValue()).toEqual(['']);
      service.removeSpecificObjective(0);
      expect(service.specificObjectives.length).toBe(1);
      service.addSpecificObjective('Nuevo');
      expect(service.specificObjectives.getRawValue()).toEqual(['', 'Nuevo']);
    });
  });

  describe('buildPreliminaryDraftPayload', () => {
    it('debería retornar null si no hay propuesta seleccionada', () => {
      const payload = service.buildPreliminaryDraftPayload(null, null);
      expect(payload).toBeNull();
    });

    it('debería construir el payload correctamente para un nuevo registro', () => {
      const mockUser = createMockUser({ id: 'u1' });
      const proposal = createMockProposal({ id: 'p1', title: 'Prop original', description: 'Desc original', director: mockUser });

      proposalsSignal.set([proposal]);
      currentUserSignal.set(mockUser);
      service.form.patchValue({ proposalId: 'p1' });

      const archivo = new File(['%PDF'], 'anteproyecto.pdf');
      const payload = service.buildPreliminaryDraftPayload(null, archivo);

      expect(payload).toBeTruthy();
      expect(payload?.attachment).toBe(archivo);
      expect(payload?.proposalId).toBe('p1');
      expect(payload?.state).toBe(stateList.EN_REVISION);
      expect(payload?.proposalData.title).toBe('Prop original');
      expect(payload?.documents).toEqual([]);
    });

    it('en edición conserva los documentos, lleva los datos corregidos y adjunta la nueva versión', () => {
      const mockUser = createMockUser({ id: 'u1' });
      const proposal = createMockProposal({ id: 'p-edit', title: 'Título de la propuesta', director: mockUser });
      const documentos: FileDocument[] = [{ id: 'v1', name: 'anteproyecto', url: '/a', uploadDate: new Date(),
        type: DocumentType.ANTEPROYECTO, version: 1 }];
      const originalDraft = createMockPreliminaryDraft({ preliminaryDraftId: 'draft-2', proposalId: 'p-edit',
        proposalData: proposal, documents: documentos });

      proposalsSignal.set([proposal]);
      currentUserSignal.set(mockUser);
      service.initForEdit(originalDraft);
      service.form.patchValue({ title: ' Título corregido ', generalObjective: 'General', description: '',
        lineOfResearch: ' IA ' });
      service.specificObjectives.at(0).setValue('Específico');
      service.addSpecificObjective('  ');

      const archivo = new File(['%PDF'], 'anteproyecto-v2.pdf');
      const payload = service.buildPreliminaryDraftPayload(originalDraft, archivo);

      expect(payload?.preliminaryDraftId).toBe('draft-2');
      expect(payload?.proposalData).toEqual(expect.objectContaining({
        id: 'p-edit', title: 'Título corregido', objectives: ['General', 'Específico'],
        // Sin descripción, el front la llena con el objetivo general (el backend la guarda vacía)
        description: 'General', lineOfResearch: 'IA'
      }));
      expect(payload?.documents).toEqual(documentos);
      expect(payload?.attachment).toBe(archivo);
    });
  });

  describe('Métodos de utilidades de nombres', () => {
    it('getMemberName debería concatenar correctamente los nombres completos', () => {
      const user = createMockUser({ firstName: 'Ana', secondName: 'María', lastName: 'López', secondLastName: 'Cruz' });
      expect(service.getMemberName(user)).toBe('Ana María López Cruz');
    });

    it('getMemberName debería omitir partes del nombre vacías o nulas', () => {
      const user = createMockUser({ firstName: 'Ana', secondName: '', lastName: 'López', secondLastName: undefined });
      expect(service.getMemberName(user)).toBe('Ana López');
    });

    it('getMemberName debería retornar "No asignado" si el usuario es undefined', () => {
      expect(service.getMemberName(undefined)).toBe('No asignado');
    });

    it('getAuthorsNames debería delegar al UserService', () => {
      const mockUsers = [createMockUser()];
      const result = service.getAuthorsNames(mockUsers);
      expect(mockUserService.getAuthorsNames).toHaveBeenCalledWith(mockUsers);
      expect(result).toBe('Autor de Prueba');
    });
  });
});
