import { TrabajoGradoApiService } from '../../../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { CatalogApiService } from '../../../../../core/services/catalog/catalog-api.service';
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
import { ContractType } from '../../../../users/enum/contract-type.enum';
import { Modality } from '../../../enums/modality.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../../core/enums/document-type.enum';

interface MockUserService {
  teachers: WritableSignal<User[]>;
  advisors: WritableSignal<User[]>;
  students: WritableSignal<User[]>;
}

interface MockAuthService {
  currentUser: WritableSignal<User | null>;
}

interface MockProposalService {
  proposals: WritableSignal<Proposal[]>;
}

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

describe('ProposalFormService', () => {
  let service: ProposalFormService;
  let mockUserService: MockUserService;
  let mockAuthService: MockAuthService;
  let mockProposalService: MockProposalService;
  const SISTEMAS = { id: 1, name: 'Departamento de Sistemas' };
  const TELEMATICA = { id: 2, name: 'Departamento de Telemática' };
  const ING_SISTEMAS = { id: 7, name: 'Ingeniería de Sistemas' };
  const ING_ELECTRONICA = { id: 8, name: 'Ingeniería Electrónica' };
  const mockDirector = createMockUser({ id: 'director-1', firstName: 'Carlos', lastName: 'Ramirez',
    contractType: ContractType.PLANTA, department: SISTEMAS });
  const mockTeacher1 = createMockUser({
    id: 'teacher-1',
    firstName: 'Maria',
    secondName: 'Elena',
    lastName: 'Gomez',
    secondLastName: 'Perez',
    contractType: ContractType.PLANTA,
    department: SISTEMAS
  });
  const mockTeacherInactive = createMockUser({ id: 'teacher-inactive', firstName: 'Juan', state: UserState.inactive });
  const mockAdvisor1 = createMockUser({ id: 'advisor-1', firstName: 'Pedro', lastName: 'Sánchez' });
  const mockStudent1 = createMockUser({ id: 'stu-1', firstName: 'Ana', lastName: 'Rojas', program: ING_SISTEMAS });
  const mockStudent2 = createMockUser({ id: 'stu-2', firstName: 'Luis', lastName: 'Torres', program: ING_SISTEMAS });
  const mockStudentBusy = createMockUser({ id: 'stu-busy', firstName: 'Estudiante', lastName: 'Ocupado' });
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockUserService = {
      teachers: signal([mockDirector, mockTeacher1, mockTeacherInactive]),
      advisors: signal([mockAdvisor1]),
      students: signal([mockStudent1, mockStudent2, mockStudentBusy])
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
        { provide: ProposalService, useValue: mockProposalService },
        // El backend solo permite elegir a stu-1 y stu-2 (stu-busy ya tiene un trabajo activo)
        { provide: TrabajoGradoApiService, useValue: { estudiantesDisponibles: () => of(['stu-1', 'stu-2'] as unknown as number[]) } },
        // Ingeniería de Sistemas está adscrita a Sistemas; Ingeniería Electrónica, a Telemática
        { provide: CatalogApiService, useValue: { getPrograms: () => of([
          { ...ING_SISTEMAS, parentId: SISTEMAS.id }, { ...ING_ELECTRONICA, parentId: TELEMATICA.id }
        ]) } }
      ]
    });
    service = TestBed.inject(ProposalFormService);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Reglas de participantes del backend', () => {
    const mockStudentOtroPrograma = createMockUser({ id: 'stu-3', firstName: 'Eva', lastName: 'Mora',
      program: ING_ELECTRONICA });
    const docenteCatedraSistemas = createMockUser({ id: 'cat-1', firstName: 'Rosa', lastName: 'Cátedra',
      contractType: ContractType.CATEDRA, department: SISTEMAS });
    const docentePlantaTelematica = createMockUser({ id: 'tel-1', firstName: 'Tomás', lastName: 'Planta',
      contractType: ContractType.PLANTA, department: TELEMATICA });
    const posgrado = createMockUser({ id: 'pos-1', firstName: 'Pablo', lastName: 'Posgrado',
      contractType: ContractType.ESTUDIANTE_POSGRADO, department: SISTEMAS });
    const sinPerfil = createMockUser({ id: 'sin-1', firstName: 'Sara', lastName: 'SinPerfil' });

    const ids = (options: { id: string }[]) => options.map(option => option.id);

    it('el estudiante 2 solo puede ser del programa del estudiante 1', () => {
      mockUserService.students.set([mockStudent1, mockStudent2, mockStudentOtroPrograma]);
      service.form.controls.student1.setValue('stu-1');
      expect(service.student1Program()).toEqual(ING_SISTEMAS);
      expect(ids(service.student2Options())).toEqual(['stu-2']);
    });

    it('al cambiar el estudiante 1 se quita un estudiante 2 de otro programa', () => {
      mockUserService.students.set([mockStudent1, mockStudent2, mockStudentOtroPrograma]);
      service.form.controls.student1.setValue('stu-2');
      service.form.controls.student2.setValue('stu-1');
      service.form.controls.student1.setValue('stu-1');
      expect(service.form.controls.student2.value).toBe('');
    });

    it('la práctica profesional es de un solo estudiante', () => {
      service.form.controls.student2.setValue('stu-2');
      service.form.controls.modality.setValue(Modality.PP);
      expect(service.form.controls.student2.value).toBe('');
    });

    it('el codirector necesita perfil docente y no puede ser estudiante de posgrado', () => {
      mockUserService.teachers.set([mockDirector, mockTeacher1, docentePlantaTelematica, posgrado, sinPerfil]);
      expect(service.directorRequiresCodirector()).toBe(false);
      expect(ids(service.codirectorOptions())).toEqual(['teacher-1', 'tel-1']);
    });

    it('el jefe del departamento del director no puede ser codirector; el de otro departamento sí', () => {
      const jefeSistemas = createMockUser({ id: 'jefe-sis', firstName: 'Javier', lastName: 'Jefe',
        contractType: ContractType.PLANTA, department: SISTEMAS, roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] });
      const jefeTelematica = createMockUser({ id: 'jefe-tel', firstName: 'José', lastName: 'Jefe',
        contractType: ContractType.PLANTA, department: TELEMATICA, roles: [UserRoleType.DOCENTE, UserRoleType.JEFE_DEP] });
      mockUserService.teachers.set([mockDirector, mockTeacher1, jefeSistemas, jefeTelematica]);

      expect(ids(service.codirectorOptions())).toEqual(['teacher-1', 'jefe-tel']);
    });

    it('un miembro del Comité del programa de los estudiantes no puede ser codirector; uno de otro departamento sí', () => {
      const comiteSistemas = createMockUser({ id: 'com-sis', firstName: 'Diego', lastName: 'Comité',
        contractType: ContractType.PLANTA, department: SISTEMAS, roles: [UserRoleType.DOCENTE, UserRoleType.COMITE] });
      const comiteTelematica = createMockUser({ id: 'com-tel', firstName: 'José', lastName: 'Comité',
        contractType: ContractType.PLANTA, department: TELEMATICA, roles: [UserRoleType.DOCENTE, UserRoleType.COMITE] });
      mockUserService.teachers.set([mockDirector, mockTeacher1, comiteSistemas, comiteTelematica]);
      mockUserService.students.set([mockStudent1, mockStudentOtroPrograma]);

      // Sin estudiante aún no se conoce el Comité que evalúa
      expect(ids(service.codirectorOptions())).toEqual(['teacher-1', 'com-sis', 'com-tel']);

      // Estudiante de Ingeniería de Sistemas: evalúa el Comité de Sistemas
      service.form.controls.codirector.setValue('com-sis');
      service.form.controls.student1.setValue('stu-1');
      expect(ids(service.codirectorOptions())).toEqual(['teacher-1', 'com-tel']);
      // El codirector elegido dejó de ser opción: se quita
      expect(service.form.controls.codirector.value).toBe('');

      // Estudiante de Ingeniería Electrónica (adscrita a Telemática): evalúa el Comité de Telemática
      service.form.controls.student1.setValue('stu-3');
      expect(ids(service.codirectorOptions())).toEqual(['teacher-1', 'com-sis']);
    });

    it('si el director no es de planta, el codirector es obligatorio y de planta de su departamento', () => {
      mockAuthService.currentUser.set({ ...mockDirector, contractType: ContractType.OCASIONAL });
      mockUserService.teachers.set([mockDirector, mockTeacher1, docenteCatedraSistemas, docentePlantaTelematica]);

      expect(service.directorRequiresCodirector()).toBe(true);
      expect(ids(service.codirectorOptions())).toEqual(['teacher-1']);

      service.initForCreate();
      expect(service.form.controls.codirector.hasError('required')).toBe(true);
    });
  });

  describe('Inicialización y Estructura del Formulario', () => {

    it('debería crearse correctamente', () => {
      expect(service).toBeTruthy();
    });

    it('debería tener las opciones de modalidad predefinidas', () => {
      expect(service.modalityOptions).toHaveLength(2);
      expect(service.modalityOptions[0].id).toBe(Modality.PP);
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

    it('el trabajo de investigación exige la línea de investigación; la práctica profesional no', () => {
      const linea = service.form.controls.lineOfResearch;
      service.form.get('modality')?.setValue(Modality.TI);
      expect(linea.hasError('required')).toBe(true);
      linea.setValue('Ingeniería de software');
      expect(linea.valid).toBe(true);

      linea.setValue('');
      service.form.get('modality')?.setValue(Modality.PP);
      expect(linea.valid).toBe(true);
    });

    it('exige al menos un objetivo específico con texto', () => {
      service.initForCreate();
      const especificos = service.specificObjectives;
      expect(especificos.hasError('objetivosEspecificos')).toBe(true);
      service.addSpecificObjective('   ');
      expect(especificos.hasError('objetivosEspecificos')).toBe(true);
      especificos.at(1).setValue('Diseñar el módulo de reportes');
      expect(especificos.valid).toBe(true);
    });

    it('debería hacer obligatorio el campo advisor si la modalidad es "Practica profesional"', () => {
      const advisorControl = service.form.get('advisor');
      service.form.get('modality')?.setValue(Modality.PP);
      expect(advisorControl?.hasValidator(Validators.required)).toBe(true);
    });

    it('debería remover la validación de advisor y limpiar su valor si la modalidad no es "Practica profesional"', () => {
      const advisorControl = service.form.get('advisor');
      service.form.get('modality')?.setValue(Modality.PP);
      advisorControl?.setValue('advisor-1');
      service.form.get('modality')?.setValue(Modality.TI);
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
      expect(options[0].label).toBe('Maria Elena Gomez Perez');
    });

    it('debería filtrar advisorOptions excluyendo inactivos y al usuario actual', () => {
      const options = service.advisorOptions();
      expect(options).toHaveLength(1);
      expect(options[0].id).toBe('advisor-1');
      expect(options[0].label).toBe('Pedro Sánchez');
    });

    it('student1Options solo ofrece los estudiantes disponibles según el backend', () => {
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

    it('al crear deja un solo campo de objetivo específico vacío', () => {
      service.addSpecificObjective('Anterior');
      service.initForCreate();
      expect(service.form.getRawValue().specificObjectives).toEqual(['']);
    });

    it('agrega y quita objetivos específicos, dejando siempre al menos un campo', () => {
      service.addSpecificObjective('Segundo');
      expect(service.specificObjectives.length).toBe(2);
      service.removeSpecificObjective(0);
      expect(service.form.getRawValue().specificObjectives).toEqual(['Segundo']);
      service.removeSpecificObjective(0);
      expect(service.specificObjectives.length).toBe(1);
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
      expect(service.form.getRawValue()).toEqual(expect.objectContaining({
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

  describe('Edición: objetivos y participantes', () => {
    it('separa el objetivo general, los específicos y la descripción', () => {
      service.initForEdit(createMockProposal({
        description: 'Contexto del trabajo',
        objectives: ['General', 'Específico 1', 'Específico 2'],
        lineOfResearch: 'IA',
        organization: 'Empresa'
      }));
      expect(service.form.getRawValue()).toEqual(expect.objectContaining({
        description: 'General',
        specificObjectives: ['Específico 1', 'Específico 2'],
        generalDescription: 'Contexto del trabajo',
        lineOfResearch: 'IA',
        organization: 'Empresa'
      }));
    });

    it('sin objetivos específicos deja un campo vacío', () => {
      service.initForEdit(createMockProposal({ objectives: ['General'] }));
      expect(service.form.getRawValue().specificObjectives).toEqual(['']);
    });

    it('no repite el objetivo general como descripción', () => {
      service.initForEdit(createMockProposal({ description: 'General', objectives: ['General'] }));
      expect(service.form.getRawValue().generalDescription).toBe('');
    });

    it('bloquea los participantes al editar y los habilita al crear', () => {
      service.initForEdit(createMockProposal());
      ['modality', 'student1', 'student2', 'codirector', 'advisor', 'organization']
        .forEach(campo => expect(service.form.get(campo)?.disabled).toBe(true));
      expect(service.form.get('title')?.enabled).toBe(true);

      service.initForCreate();
      expect(service.form.get('modality')?.enabled).toBe(true);
    });
  });

  describe('Construcción del Payload (buildProposalPayload)', () => {
    const formatoA = new File(['%PDF'], 'formatoA.pdf');

    it('debería retornar null si no hay un director autenticado', () => {
      mockAuthService.currentUser.set(null);
      const payload = service.buildProposalPayload(null, {});
      expect(payload).toBeNull();
    });

    it('debería construir el payload completo para una propuesta nueva', () => {
      service.form.get('modality')?.setValue(Modality.PP);
      service.form.patchValue({
        title: 'Nueva Propuesta',
        description: 'Objetivo general',
        specificObjectives: ['Específico 1'],
        generalDescription: '',
        lineOfResearch: ' Software ',
        student1: 'stu-1',
        student2: 'stu-2',
        codirector: 'teacher-1',
        advisor: 'advisor-1',
        organization: 'Empresa S.A.'
      });
      // Un campo vacío no se envía y los objetivos se recortan
      service.addSpecificObjective('');
      service.addSpecificObjective('  Específico 2  ');
      const payload = service.buildProposalPayload(null, { proposal: formatoA });
      expect(payload?.title).toBe('Nueva Propuesta');
      expect(payload?.objectives).toEqual(['Objetivo general', 'Específico 1', 'Específico 2']);
      expect(payload?.description).toBe('Objetivo general');
      expect(payload?.lineOfResearch).toBe('Software');
      expect(payload?.modality).toBe(Modality.PP);
      expect(payload?.authors).toEqual([mockStudent1, mockStudent2]);
      expect(payload?.director).toEqual(mockDirector);
      expect(payload?.codirector).toEqual(mockTeacher1);
      expect(payload?.advisor).toEqual(mockAdvisor1);
      expect(payload?.organization).toBe('Empresa S.A.');
      expect(payload?.state).toBe(stateList.EN_REVISION);
      expect(payload?.attachments).toEqual({ proposal: formatoA });
    });

    it('usa la descripción general cuando se diligencia', () => {
      service.form.patchValue({ title: 'T', description: 'Objetivo', generalDescription: 'Descripción amplia' });
      expect(service.buildProposalPayload(null, {})?.description).toBe('Descripción amplia');
    });

    it('debería mantener la metadata y los participantes originales al actualizar', () => {
      const originalProposal = createMockProposal({
        id: 'prop-100',
        createdAt: new Date('2023-01-01'),
        state: stateList.NO_APROBADO,
        authors: [mockStudent1],
        codirector: mockTeacher1,
        documents: [createMockDocument()]
      });
      service.initForEdit(originalProposal);
      service.form.patchValue({ title: 'Propuesta Editada' });
      const payload = service.buildProposalPayload(originalProposal, {});
      expect(payload?.id).toBe('prop-100');
      expect(payload?.title).toBe('Propuesta Editada');
      expect(payload?.createdAt).toEqual(new Date('2023-01-01'));
      expect(payload?.state).toBe(stateList.NO_APROBADO);
      expect(payload?.authors).toEqual([mockStudent1]);
      expect(payload?.codirector).toEqual(mockTeacher1);
      expect(payload?.documents).toHaveLength(1);
    });
  });
});
