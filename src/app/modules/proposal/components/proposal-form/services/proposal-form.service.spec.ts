import { TestBed } from '@angular/core/testing';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { signal } from '@angular/core';

import { ProposalFormService } from './proposal-form.service';
import { UserService } from '../../../../users/services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ProposalService } from '../../../services/proposal.service';

import { User } from '../../../../users/interfaces/user.interface';
import { Proposal } from '../../../interfaces/proposal.interface';
import { UserState } from '../../../../users/enum/user-state.enum';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';


describe('ProposalFormService', () => {
  let service: ProposalFormService;

  // Mocks con Signals reales para probar la reactividad de los computeds
  const mockCurrentUserSignal = signal<Partial<User> | null>(null);
  const mockTeachersSignal = signal<User[]>([]);
  const mockAdvisorsSignal = signal<User[]>([]);
  const mockStudentsSignal = signal<User[]>([]);
  const mockProposalsSignal = signal<Proposal[]>([]);

  let mockUserService: jest.Mocked<UserService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockProposalService: jest.Mocked<ProposalService>;

  // Data de prueba
  const mockDirector: User = {
    id: 'director-1',
    firstName: 'Carlos',
    lastName: 'Ramirez',
    state: UserState.active
  } as User;

  const mockTeacher1: User = {
    id: 'teacher-1',
    firstName: 'Maria',
    secondName: 'Elena',
    lastName: 'Gomez',
    secondLastName: 'Perez',
    state: UserState.active
  } as User;

  const mockTeacherInactive: User = {
    id: 'teacher-inactive',
    firstName: 'Juan',
    lastName: 'Inactivo',
    state: UserState.inactive
  } as User;

  const mockAdvisor1: User = {
    id: 'advisor-1',
    firstName: 'Pedro',
    lastName: 'Sánchez',
    state: UserState.active
  } as User;

  const mockStudent1: User = {
    id: 'stu-1',
    firstName: 'Ana',
    lastName: 'Rojas',
    state: UserState.active
  } as User;

  const mockStudent2: User = {
    id: 'stu-2',
    firstName: 'Luis',
    lastName: 'Torres',
    state: UserState.active
  } as User;

  const mockStudentBusy: User = {
    id: 'stu-busy',
    firstName: 'Estudiante',
    lastName: 'Ocupado',
    state: UserState.active
  } as User;

  beforeEach(() => {
    // Reseteamos señales
    mockCurrentUserSignal.set(mockDirector);
    mockTeachersSignal.set([mockDirector, mockTeacher1, mockTeacherInactive]);
    mockAdvisorsSignal.set([mockAdvisor1]);
    mockStudentsSignal.set([mockStudent1, mockStudent2, mockStudentBusy]);
    mockProposalsSignal.set([
      {
        id: 'prop-busy',
        authors: [{ id: 'stu-busy' }]
      } as unknown as Proposal
    ]);

    mockUserService = {
      teachers: mockTeachersSignal,
      advisors: mockAdvisorsSignal,
      students: mockStudentsSignal,
      addRoleToUser: jest.fn()
    } as unknown as jest.Mocked<UserService>;

    mockAuthService = {
      currentUser: mockCurrentUserSignal
    } as unknown as jest.Mocked<AuthService>;

    mockProposalService = {
      proposals: mockProposalsSignal
    } as unknown as jest.Mocked<ProposalService>;

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
    jest.clearAllMocks();
  });

  describe('Inicialización y Estructura del Formulario', () => {
    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener las opciones de modalidad predefinidas', () => {
      expect(service.modalityOptions).toHaveLength(2);
      expect(service.modalityOptions[0].id).toBe('Practica profesional');
    });

    it('debería inicializar el formulario con los campos requeridos', () => {
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

      // Primero seteamos practica profesional para hacer que sea requerido y tenga valor
      service.form.get('modality')?.setValue('Practica profesional');
      advisorControl?.setValue('advisor-1');

      // Cambiamos a Trabajo de investigación
      service.form.get('modality')?.setValue('Trabajo de investigacion');

      expect(advisorControl?.hasValidator(Validators.required)).toBe(false);
      expect(advisorControl?.value).toBe('');
    });

    it('debería actualizar selectedStudent1Id y limpiar student2 si coincide con student1', () => {
      service.form.get('student2')?.setValue('stu-1');

      // Seleccionamos stu-1 como estudiante 1
      service.form.get('student1')?.setValue('stu-1');

      expect(service.selectedStudent1Id()).toBe('stu-1');
      expect(service.form.get('student2')?.value).toBe(''); // Se debe resetear student2
    });
  });

  describe('Opciones Computadas (computed signals)', () => {
    it('debería filtrar codirectorOptions excluyendo al usuario actual e inactivos', () => {
      const options = service.codirectorOptions();

      // Debe excluir al mockDirector (usuario actual) y al mockTeacherInactive
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('teacher-1');
      expect(options[0].label).toBe('Maria Elena Gomez Perez'); // Valida concatenación de nombres
    });

    it('debería filtrar advisorOptions excluyendo inactivos y al usuario actual si aplicara', () => {
      const options = service.advisorOptions();

      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('advisor-1');
      expect(options[0].label).toBe('Pedro Sánchez');
    });

    it('debería filtrar student1Options excluyendo estudiantes asignados a otras propuestas', () => {
      const options = service.student1Options();

      // stu-busy está asignado a 'prop-busy', por lo que debe ser excluido
      expect(options).toHaveLength(2);
      expect(options.map(o => o.id)).toEqual(['stu-1', 'stu-2']);
    });

    it('debería incluir al estudiante asignado si estamos editando la propuesta correspondiente', () => {
      service.currentProposalId.set('prop-busy');

      const options = service.student1Options();

      // Ahora stu-busy debe incluirse porque pertenece a la propuesta actual
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
    it('debería resetear el formulario e id al llamar initForCreate', () => {
      service.currentProposalId.set('prop-123');
      service.form.patchValue({ title: 'Título previo' });

      service.initForCreate();

      expect(service.currentProposalId()).toBeNull();
      expect(service.form.get('title')?.value).toBe('');
    });

    it('debería cargar los datos de una propuesta al llamar initForEdit', () => {
      const mockProposal: Proposal = {
        id: 'prop-99',
        title: 'Sistema de Información',
        description: 'Descripción detallada',
        modality: 'Trabajo de investigacion',
        authors: [{ id: 'stu-1' }, { id: 'stu-2' }],
        codirector: { id: 'teacher-1' },
        advisor: { id: 'advisor-1' }
      } as unknown as Proposal;

      service.initForEdit(mockProposal);

      expect(service.currentProposalId()).toBe('prop-99');
      expect(service.selectedStudent1Id()).toBe('stu-1');
      expect(service.form.value).toEqual({
        title: 'Sistema de Información',
        description: 'Descripción detallada',
        modality: 'Trabajo de investigacion',
        student1: 'stu-1',
        student2: 'stu-2',
        codirector: 'teacher-1',
        advisor: 'advisor-1'
      });
    });
  });

  describe('Construcción del Payload (buildProposalPayload)', () => {
    it('debería retornar null si no hay un director autenticado', () => {
      // Cambiamos el valor del Signal directamente en lugar de usar mockReturnValue
      mockCurrentUserSignal.set(null);

      const payload = service.buildProposalPayload(null, []);

      expect(payload).toBeNull();
    });

    it('debería construir el payload completo para una propuesta nueva', () => {
      service.form.patchValue({
        title: 'Nueva Propuesta',
        description: 'Detalle de propuesta',
        modality: 'Practica profesional',
        student1: 'stu-1',
        student2: 'stu-2',
        codirector: 'teacher-1',
        advisor: 'advisor-1'
      });

      const mockDocuments = [{ name: 'formatoA.pdf' }] as FileDocument[];

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
      expect(mockUserService.addRoleToUser).toHaveBeenCalledWith('teacher-1', UserRoleType.CODIRECTOR);
    });

    it('debería mantener la información original al actualizar una propuesta existente', () => {
      const originalProposal: Proposal = {
        id: 'prop-100',
        createdAt: new Date('2023-01-01'),
        state: stateList.EN_REVISION,
        evaluations: [{ id: 'eval-1' }]
      } as unknown as Proposal;

      service.form.patchValue({
        title: 'Propuesta Editada',
        description: 'Descripción Editada',
        modality: 'Trabajo de investigacion',
        student1: 'stu-1'
      });

      const payload = service.buildProposalPayload(originalProposal, []);

      expect(payload?.id).toBe('prop-100');
      expect(payload?.createdAt).toEqual(new Date('2023-01-01'));
      expect(payload?.evaluations).toEqual([{ id: 'eval-1' }]);
    });
  });
});
