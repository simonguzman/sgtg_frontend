import { TestBed } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { PreliminaryDraftFormService } from './preliminary-draft-form.service';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { stateList } from '../../../../../core/enums/state.enum';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { signal, WritableSignal } from '@angular/core';
import { User } from '../../../../users/interfaces/user.interface';

describe('PreliminaryDraftFormService', () => {
  let service: PreliminaryDraftFormService;

  // Mocks de dependencias
  let mockProposalService: Partial<ProposalService>;
  let mockAuthService: Partial<AuthService>;
  let mockPreliminaryDraftService: Partial<PreliminaryDraftService>;
  let mockUserService: Partial<UserService>;

  // Referencias a los WritableSignals para mutarlos limpiamente
  let currentUserSignal: WritableSignal<User | null>;
  let proposalsSignal: WritableSignal<Proposal[]>;
  let draftsSignal: WritableSignal<PreliminaryDraft[]>;

  beforeEach(() => {
    // 1. Inicializamos las Signals localmente
    currentUserSignal = signal<User | null>(null);
    proposalsSignal = signal<Proposal[]>([]);
    draftsSignal = signal<PreliminaryDraft[]>([]);

    // 2. Asignamos esas Signals a los mocks (sin usar any)
    mockProposalService = { proposals: proposalsSignal };
    mockAuthService = { currentUser: currentUserSignal };
    mockPreliminaryDraftService = { preliminaryDrafts: draftsSignal };

    mockUserService = { getAuthorsNames: jest.fn().mockReturnValue('Autores') };

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

    service = TestBed.inject(PreliminaryDraftFormService);
  });

  describe('availableProposals (Signal Computed)', () => {
    it('debería retornar solo propuestas aprobadas donde el usuario sea director y no tengan anteproyecto', () => {
      const mockUser = { id: 'u1' } as User;

      const proposals: Proposal[] = [
        { id: 'p1', state: stateList.APROBADO, director: { id: 'u1' } }, // Válida
        { id: 'p2', state: stateList.EN_REVISION, director: { id: 'u1' } }, // Estado inválido
        { id: 'p3', state: stateList.APROBADO, director: { id: 'u2' } }, // Director diferente
        { id: 'p4', state: stateList.APROBADO, director: { id: 'u1' } }  // Simulamos que ya tiene anteproyecto
      ] as unknown as Proposal[];

      const drafts: PreliminaryDraft[] = [
        { proposalId: 'p4' }
      ] as unknown as PreliminaryDraft[];

      // Corrección: Usamos .set() sobre las referencias en lugar de reasignar las propiedades 'readonly'
      currentUserSignal.set(mockUser);
      proposalsSignal.set(proposals);
      draftsSignal.set(drafts);

      const result = service.availableProposals();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');
    });
  });

  describe('Flujo de inicialización', () => {
    it('initForCreate debería limpiar el formulario y deshabilitar titulo/descripcion', () => {
      service.initForCreate();

      expect(service.currentPreliminaryDraftId()).toBeNull();
      expect(service.form.get('title')?.disabled).toBeTruthy();
      expect(service.form.get('description')?.disabled).toBeTruthy();
    });

    it('initForEdit debería popular el formulario y habilitar campos', () => {
      const mockDraft = {
        preliminaryDraftId: 'draft-1',
        proposalId: 'p1',
        proposalData: { title: 'Test', description: 'Desc' }
      } as unknown as PreliminaryDraft;

      service.initForEdit(mockDraft);

      expect(service.currentPreliminaryDraftId()).toBe('draft-1');
      expect(service.form.get('proposalId')?.value).toBe('p1');
      expect(service.form.get('title')?.value).toBe('Test');
      expect(service.form.get('title')?.enabled).toBeTruthy();
    });
  });

  describe('buildPreliminaryDraftPayload', () => {
    it('debería retornar null si no hay propuesta seleccionada', () => {
      const payload = service.buildPreliminaryDraftPayload(null, []);
      expect(payload).toBeNull();
    });
  });
});
