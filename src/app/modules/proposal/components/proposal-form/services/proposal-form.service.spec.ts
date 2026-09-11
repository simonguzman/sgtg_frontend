import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';
import { of } from 'rxjs';

import { ProposalFormService } from './proposal-form.service';
import { UserService } from '../../../../users/services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ProposalService } from '../../../services/proposal.service';

import { User } from '../../../../users/interfaces/user.interface';
import { Proposal } from '../../../interfaces/proposal.interface';
import { UserState } from '../../../../users/enum/user-state.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { IdentificationType } from '../../../../users/enum/identification-type.enum';
import { Modality } from '../../../enums/modality.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

// ── Mocks Estrictos de Servicios ─────────────────────────────────────────────

interface MockUserService {
  teachers: WritableSignal<User[]>;
  advisors: WritableSignal<User[]>;
  students: WritableSignal<User[]>;
  addRoleToUser: jest.Mock;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

interface MockProposalService {
  proposals: WritableSignal<Proposal[]>;
}

// ── Funciones Fábrica fuertemente tipadas (Adiós "any" y "unknown") ──────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'default-user-id',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Nombre',
  secondName: '',
  lastName: 'Apellido',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'user@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
} as User);

const createMockProposal = (overrides: Partial<Proposal> = {}): Proposal => ({
  id: 'prop-default-id',
  title: 'Título Base',
  description: 'Descripción Base',
  modality: Modality.TI,
  authors: [],
  state: stateList.EN_REVISION,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  isActive: true,
  isArchived: false,
  ...overrides
} as Proposal);

const createMockDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'Documento.pdf',
  url: 'http://mock.url',
  uploadDate: new Date(),
  type: DocumentType.PROPUESTA,
  status: stateList.EN_REVISION,
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('ProposalFormService', () => {
  let service: ProposalFormService;

  let mockUserService: MockUserService;
  let mockAuthService: MockAuthService;
  let mockProposalService: MockProposalService;

  // Data de prueba tipada
  const mockDirector = createMockUser({ id: 'director-1', firstName: 'Carlos', lastName: 'Ramirez' });
  const mockTeacher1 = createMockUser({
    id: 'teacher-1',
    firstName: 'Maria',
    secondName: 'Elena',
    lastName: 'Gomez',
    secondLastName: 'Perez'
  });
  const mockTeacherInactive = createMockUser({ id: 'teacher-inactive', firstName: 'Juan', state: UserState.inactive });
  const mockAdvisor1 = createMockUser({ id: 'advisor-1', firstName: 'Pedro', lastName: 'Sánchez' });

  const mockStudent1 = createMockUser({ id: 'stu-1', firstName: 'Ana', lastName: 'Rojas' });
  const mockStudent2 = createMockUser({ id: 'stu-2', firstName: 'Luis', lastName: 'Torres' });
  const mockStudentBusy = createMockUser({ id: 'stu-busy', firstName: 'Estudiante', lastName: 'Ocupado' });

  beforeEach(() => {
    // 🔕 Silenciar consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockUserService = {
      teachers: signal([mockDirector, mockTeacher1, mockTeacherInactive]),
      advisors: signal([mockAdvisor1]),
      students: signal([mockStudent1, mockStudent2, mockStudentBusy]),
      // FIX: Retornar Observable para que addRoleToUser(...).pipe(first()) no rompa la prueba
      addRoleToUser: jest.fn().mockReturnValue(of(undefined))
    };

    mockAuthService = {
      currentUser: signal(mockDirector)
    };

    mockProposalService = {
      proposals: signal([
        createMockProposal({ id: 'prop-busy', authors: [mockStudentBusy] })
      ])
    };

    TestBed.configureTestingModule({
      imports: [ReactiveFormsModule],
      providers: [
        ProposalFormService,
        FormBuilder,
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ProposalService, useValue: mockProposalService }
      ]
    });

    service = TestBed.inject(ProposalFormService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Inicialización y Estructura del Formulario', () => {
    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener las opciones de modalidad predefinidas', () => {
      expect(service.modalityOptions).toHaveLength(2);
      expect(service.modalityOptions[0].id).toBe('Practica profesional');
    });

    it('debería inicializar el formulario con los campos requeridos correctamente configurados', () => {
      const form = service.form;
      expect(form.get('title')?.hasValidator(Validators.required)).toBe(true);
      expect(form.get('description')?.hasValidator(Validators.required)).toBe(true);
      expect(form.get('modality')?.hasValidator(Validators.required)).toBe(true);
      expect(form.get('student1')?.hasValidator(Validators.required)).toBe(true);

      expect(form.get('student2')?.hasValidator(Validators.required)).toBe(false);
      expect(form.get('codirector')?.hasValidator(Validators.required)).toBe(false);
      expect(form.get('advisor')?.hasValidator(Validators.required)).toBe(false);
    });
  });

  describe('Lógica Dinámica del Formulario (valueChanges)', () => {
    it('debería hacer obligatorio el campo advisor si la modalidad es "Practica profesional"', () => {
      const advisorControl = service.form.get('advisor');

      service.form.get('modality')?.setValue('Practica profesional');

      expect(advisorControl?.hasValidator(Validators.required)).toBe(true);
    });

    it('debería remover la validación de advisor y limpiar su valor si la modalidad no es "Practica profesional"', () => {
      const advisorControl = service.form.get('advisor');

      service.form.get('modality')?.setValue('Practica profesional');
      advisorControl?.setValue('advisor-1');

      service.form.get('modality')?.setValue('Trabajo de investigacion');

      expect(advisorControl?.hasValidator(Validators.required)).toBe(false);
      expect(advisorControl?.value).toBe('');
    });

    it('debería actualizar selectedStudent1Id y limpiar student2 si coincide con student1', () => {
      service.form.get('student2')?.setValue('stu-1');

      service.form.get('student1')?.setValue('stu-1');

      expect(service.selectedStudent1Id()).toBe('stu-1');
      expect(service.form.get('student2')?.value).toBe('');
    });
  });

  describe('Opciones Computadas (Signals)', () => {
    it('debería filtrar codirectorOptions excluyendo al usuario actual (director) e inactivos', () => {
      const options = service.codirectorOptions();

      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('teacher-1');
      expect(options[0].label).toBe('Maria Elena Gomez Perez'); // Valida concatenación sin doble espacio
    });

    it('debería filtrar advisorOptions excluyendo inactivos y al usuario actual', () => {
      const options = service.advisorOptions();

      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('advisor-1');
      expect(options[0].label).toBe('Pedro Sánchez');
    });

    it('debería filtrar student1Options excluyendo estudiantes asignados a otras propuestas activas', () => {
      const options = service.student1Options();

      expect(options).toHaveLength(2);
      expect(options.map(o => o.id)).toEqual(['stu-1', 'stu-2']);
    });

    it('debería incluir al estudiante asignado si estamos editando la propuesta a la que pertenece', () => {
      service.currentProposalId.set('prop-busy');

      const options = service.student1Options();

      expect(options).toHaveLength(3);
      expect(options.map(o => o.id)).toContain('stu-busy');
    });

    it('debería filtrar student2Options excluyendo al estudiante 1 seleccionado', () => {
      service.selectedStudent1Id.set('stu-1');

      const options = service.student2Options();

      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('stu-2');
    });
  });

  describe('Inicialización para Creación y Edición', () => {
    it('debería resetear el formulario y limpiar el ID al llamar initForCreate', () => {
      service.currentProposalId.set('prop-123');
      service.form.patchValue({ title: 'Título previo' });

      service.initForCreate();

      expect(service.currentProposalId()).toBeNull();
      expect(service.form.get('title')?.value).toBe('');
    });

    it('debería cargar los datos de una propuesta al llamar initForEdit', () => {
      const mockProposal = createMockProposal({
        id: 'prop-99',
        title: 'Sistema de Información',
        description: 'Descripción detallada',
        modality: Modality.TI,
        authors: [mockStudent1, mockStudent2],
        codirector: mockTeacher1,
        advisor: mockAdvisor1
      });

      service.initForEdit(mockProposal);

      expect(service.currentProposalId()).toBe('prop-99');
      expect(service.selectedStudent1Id()).toBe('stu-1');
      expect(service.form.value).toEqual(expect.objectContaining({
        title: 'Sistema de Información',
        description: 'Descripción detallada',
        modality: Modality.TI,
        student1: 'stu-1',
        student2: 'stu-2',
        codirector: 'teacher-1',
        advisor: 'advisor-1'
      }));
    });
  });

  describe('Construcción del Payload (buildProposalPayload)', () => {
    it('debería retornar null si no hay un director autenticado', () => {
      mockAuthService.currentUser.set(null);

      const payload = service.buildProposalPayload(null, []);

      expect(payload).toBeNull();
    });

    it('debería construir el payload completo para una propuesta nueva y suscribirse a addRoleToUser', () => {
      service.form.patchValue({
        title: 'Nueva Propuesta',
        description: 'Detalle de propuesta',
        modality: 'Practica profesional',
        student1: 'stu-1',
        student2: 'stu-2',
        codirector: 'teacher-1',
        advisor: 'advisor-1'
      });

      const mockDocuments = [createMockDocument({ name: 'formatoA.pdf' })];

      const payload = service.buildProposalPayload(null, mockDocuments);

      expect(payload).toBeDefined();
      expect(payload?.title).toBe('Nueva Propuesta');
      expect(payload?.authors).toEqual([mockStudent1, mockStudent2]);
      expect(payload?.director).toEqual(mockDirector);
      expect(payload?.codirector).toEqual(mockTeacher1);
      expect(payload?.advisor).toEqual(mockAdvisor1);
      expect(payload?.state).toBe(stateList.EN_REVISION);
      expect(payload?.documents).toEqual(mockDocuments);
      expect(payload?.evaluations).toEqual([]);

      // Valida que el fix de asignar codirector funcione sin romper la prueba
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('teacher-1', UserRoleType.CODIRECTOR);
    });

    it('debería mantener la metadata original al actualizar una propuesta existente', () => {
      const originalProposal = createMockProposal({
        id: 'prop-100',
        createdAt: new Date('2023-01-01'),
        state: stateList.APROBADO
      });

      service.form.patchValue({
        title: 'Propuesta Editada',
        modality: 'Trabajo de investigacion',
        student1: 'stu-1'
      });

      const payload = service.buildProposalPayload(originalProposal, []);

      expect(payload?.id).toBe('prop-100');
      expect(payload?.createdAt).toEqual(new Date('2023-01-01'));
      expect(payload?.state).toBe(stateList.APROBADO);
    });
  });
});
