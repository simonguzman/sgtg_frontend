import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { TrabajoGradoApiService } from '../../../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { UserService } from '../../../../users/services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ProposalService } from '../../../services/proposal.service';
import { Proposal, ProposalAttachments } from '../../../interfaces/proposal.interface';
import { UserState } from '../../../../users/enum/user-state.enum';
import { SelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../enums/modality.enum';
import { ContractType } from '../../../../users/enum/contract-type.enum';

/** Campos de participantes: se fijan al crear el trabajo y no se editan después. */
const CAMPOS_PARTICIPANTES = ['modality', 'student1', 'student2', 'codirector', 'advisor', 'organization'] as const;

@Injectable()
export class ProposalFormService {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly proposalService = inject(ProposalService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly trabajoApi = inject(TrabajoGradoApiService);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    /** Objetivo general (primer objetivo del trabajo) */
    description: ['', Validators.required],
    /** Objetivos específicos, un campo por objetivo (opcionales; los vacíos no se envían) */
    specificObjectives: this.fb.array<FormControl<string>>([this.fb.nonNullable.control('')]),
    generalDescription: [''],
    lineOfResearch: [''],
    modality: ['', Validators.required],
    student1: ['', Validators.required],
    student2: [''],
    codirector: [''],
    advisor: [''],
    organization: ['']
  });

  readonly selectedStudent1Id = signal<string>('');

  readonly modalityOptions: SelectOption[] = [
    { id: Modality.PP, label: 'Práctica profesional' },
    { id: Modality.TI, label: 'Trabajo de investigación' }
  ];

  private readonly availableTeachers = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.userService.teachers().filter(teacher => teacher.state === UserState.active && teacher.id !== currentUserId);
  });

  private readonly availableAdvisors = computed(() => {
    const currentUserId = this.authService.currentUser()?.id;
    return this.userService.advisors().filter(advisor => advisor.state === UserState.active && advisor.id !== currentUserId);
  });

  /**
   * Estudiantes que el backend permite elegir: sin otro trabajo activo (de
   * cualquier modalidad) y sin un trabajo aprobado. Vacío hasta que responde.
   */
  private readonly disponibles = toSignal(this.trabajoApi.estudiantesDisponibles().pipe(
    map(ids => new Set(ids.map(String))),
    catchError(() => of(new Set<string>()))
  ), { initialValue: new Set<string>() });

  private readonly availableStudents = computed(() => {
    const activeStudents = this.userService.students().filter(student => student.state === UserState.active);
    const currentId = this.currentProposalId();
    // Al editar, los estudiantes del propio trabajo siguen en la lista
    const propios = new Set(this.proposalService.proposals().find(proposal => proposal.id === currentId)?.authors
      .map(author => author.id) ?? []);

    return activeStudents.filter(student => this.disponibles().has(student.id) || propios.has(student.id));
  });

  readonly currentProposalId = signal<string | null>(null);

  readonly student1Options = computed<SelectOption[]>(() =>
    this.availableStudents().map(student => this.mapUserToOption(student))
  );

  /**
   * Programa del estudiante 1. El estudiante 2 debe ser del mismo: un trabajo
   * tiene un solo Comité de Programa (el backend rechaza estudiantes de
   * programas distintos).
   */
  readonly student1Program = computed(() =>
    this.userService.students().find(student => student.id === this.selectedStudent1Id())?.program ?? null);

  readonly student2Options = computed<SelectOption[]>(() => {
    const programa = this.student1Program();
    return this.availableStudents()
      .filter(student => student.id !== this.selectedStudent1Id())
      .filter(student => this.isEditing() || !programa || student.program?.id === programa.id)
      .map(student => this.mapUserToOption(student));
  });

  /** El director en sesión no es de planta: el codirector es obligatorio y de planta de su departamento (Art. 6). */
  readonly directorRequiresCodirector = computed(() => {
    const contractType = this.authService.currentUser()?.contractType;
    return !!contractType && contractType !== ContractType.PLANTA;
  });

  readonly directorDepartment = computed(() => this.authService.currentUser()?.department ?? null);

  /**
   * Docentes que pueden ser codirector: con perfil docente y que no sean
   * estudiantes de posgrado; si el director no es de planta, solo los de
   * planta de su departamento (mismas reglas que valida el backend).
   */
  readonly codirectorOptions = computed<SelectOption[]>(() => {
    const departamento = this.directorDepartment();
    const soloDePlanta = this.directorRequiresCodirector();
    return this.availableTeachers()
      .filter(teacher => this.isEditing() || (!!teacher.department && teacher.contractType !== ContractType.ESTUDIANTE_POSGRADO))
      .filter(teacher => this.isEditing() || !soloDePlanta
        || (teacher.contractType === ContractType.PLANTA && teacher.department?.id === departamento?.id))
      .map(teacher => this.mapUserToOption(teacher));
  });

  /** Al corregir, los participantes ya están fijados: no se filtran sus opciones. */
  private isEditing(): boolean {
    return this.currentProposalId() !== null;
  }

  readonly advisorOptions = computed<SelectOption[]>(() =>
    this.availableAdvisors().map(advisor => this.mapUserToOption(advisor))
  );

  constructor() {
    this.setupDynamicLogic();
  }

  get specificObjectives(): FormArray<FormControl<string>> {
    return this.form.controls.specificObjectives;
  }

  addSpecificObjective(value = ''): void {
    this.specificObjectives.push(this.fb.nonNullable.control(value));
  }

  /** Quita un objetivo específico; siempre queda al menos un campo. */
  removeSpecificObjective(index: number): void {
    if (this.specificObjectives.length > 1) this.specificObjectives.removeAt(index);
  }

  /** Deja un campo por objetivo (al menos uno vacío). */
  private setSpecificObjectives(objectives: string[]): void {
    this.specificObjectives.clear();
    (objectives.length ? objectives : ['']).forEach(objective => this.addSpecificObjective(objective));
  }

  /** @returns true si la modalidad elegida es práctica profesional */
  isProfessionalPractice(): boolean {
    return this.form.get('modality')?.value === Modality.PP;
  }

  private setupDynamicLogic(): void {
    this.form.get('modality')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(modality => {
        // La práctica profesional exige asesor de la organización y la organización
        const esPractica = modality === Modality.PP;
        for (const campo of ['advisor', 'organization'] as const) {
          const control = this.form.get(campo);
          if (esPractica) {
            control?.setValidators(Validators.required);
          } else {
            control?.clearValidators();
            control?.setValue('', { emitEvent: false });
          }
          control?.updateValueAndValidity({ emitEvent: false });
        }
        // La práctica profesional es de un solo estudiante
        if (esPractica) this.form.get('student2')?.setValue('', { emitEvent: false });
      });

    this.form.get('student1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.selectedStudent1Id.set(id ?? '');
        // El estudiante 2 debe ser otro y del mismo programa: si ya no lo es, se quita
        const student2 = this.form.get('student2')?.value;
        if (student2 && !this.student2Options().some(option => option.id === student2)) {
          this.form.get('student2')?.setValue('');
        }
      });
  }

  initForCreate(): void {
    this.currentProposalId.set(null);
    this.form.reset();
    this.setSpecificObjectives([]);
    CAMPOS_PARTICIPANTES.forEach(campo => this.form.get(campo)?.enable({ emitEvent: false }));
    const codirector = this.form.controls.codirector;
    codirector.setValidators(this.directorRequiresCodirector() ? Validators.required : []);
    codirector.updateValueAndValidity({ emitEvent: false });
  }

  initForEdit(proposal: Proposal): void {
    this.currentProposalId.set(proposal.id ?? null);
    const student1 = proposal.authors[0]?.id ?? '';
    this.selectedStudent1Id.set(student1);
    const objetivos = proposal.objectives?.length ? proposal.objectives : [proposal.description];
    const descripcion = proposal.description !== objetivos[0] ? proposal.description : '';

    this.setSpecificObjectives(objetivos.slice(1));
    this.form.patchValue({
      title: proposal.title,
      description: objetivos[0] ?? '',
      generalDescription: descripcion,
      lineOfResearch: proposal.lineOfResearch ?? '',
      modality: proposal.modality,
      codirector: proposal.codirector?.id ?? '',
      student1: student1,
      student2: proposal.authors[1]?.id ?? '',
      advisor: proposal.advisor?.id ?? '',
      organization: proposal.organization ?? ''
    });
    // Los participantes se fijan al crear el trabajo de grado
    CAMPOS_PARTICIPANTES.forEach(campo => this.form.get(campo)?.disable({ emitEvent: false }));
  }

  /**
   * Arma la propuesta para el backend. Los objetivos son el general y los
   * específicos (sin los campos vacíos); la descripción es opcional.
   */
  buildProposalPayload(originalProposal: Proposal | null, attachments: ProposalAttachments): Proposal | null {
    const raw = this.form.getRawValue();
    const currentDirector = this.authService.currentUser();

    if (!currentDirector) return null;

    const objetivos = [raw.description, ...raw.specificObjectives]
      .map(objetivo => objetivo.trim())
      .filter(objetivo => !!objetivo);

    const authorsArray = this.userService.students().filter(student =>
      student.id === raw.student1 || student.id === raw.student2
    );

    return {
      ...(originalProposal ?? undefined),
      title: raw.title,
      description: raw.generalDescription.trim() || objetivos[0],
      objectives: objetivos,
      lineOfResearch: raw.lineOfResearch.trim() || undefined,
      modality: raw.modality as Modality,
      authors: originalProposal?.authors ?? authorsArray,
      director: originalProposal?.director ?? currentDirector,
      codirector: originalProposal ? originalProposal.codirector : this.availableTeachers().find(teacher => teacher.id === raw.codirector),
      advisor: originalProposal ? originalProposal.advisor : this.availableAdvisors().find(advisor => advisor.id === raw.advisor),
      organization: raw.organization.trim() || undefined,
      state: originalProposal?.state ?? stateList.EN_REVISION,
      createdAt: originalProposal?.createdAt ?? new Date(),
      documents: originalProposal?.documents ?? [],
      evaluations: originalProposal?.evaluations ?? [],
      attachments
    } as Proposal;
  }

  private mapUserToOption(user: User): SelectOption {
    return {
      id: user.id,
      label: `${user.firstName} ${user.secondName || ''} ${user.lastName} ${user.secondLastName || ''}`.replace(/\s+/g, ' ').trim()
    };
  }
}
