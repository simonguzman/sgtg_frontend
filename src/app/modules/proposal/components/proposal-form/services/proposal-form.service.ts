import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserService } from '../../../../users/services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ProposalService } from '../../../services/proposal.service';
import { Proposal, ProposalAttachments } from '../../../interfaces/proposal.interface';
import { UserState } from '../../../../users/enum/user-state.enum';
import { SelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { Modality } from '../../../enums/modality.enum';

/** Campos de participantes: se fijan al crear el trabajo y no se editan después. */
const CAMPOS_PARTICIPANTES = ['modality', 'student1', 'student2', 'codirector', 'advisor', 'organization'] as const;

@Injectable()
export class ProposalFormService {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly proposalService = inject(ProposalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    /** Objetivo general (primer objetivo del trabajo) */
    description: ['', Validators.required],
    /** Objetivos específicos, uno por línea */
    specificObjectives: [''],
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

  private readonly availableStudents = computed(() => {
    const activeStudents = this.userService.students().filter(student => student.state === UserState.active);
    const allProposals = this.proposalService.proposals();
    const currentId = this.currentProposalId();

    return activeStudents.filter(student => {
      const pWithStudent = allProposals.find(proposal => proposal.authors.some(author => author.id === student.id));
      return !pWithStudent || (currentId ? pWithStudent.id === currentId : false);
    });
  });

  readonly currentProposalId = signal<string | null>(null);

  readonly student1Options = computed<SelectOption[]>(() =>
    this.availableStudents().map(student => this.mapUserToOption(student))
  );

  readonly student2Options = computed<SelectOption[]>(() =>
    this.availableStudents()
      .filter(student => student.id !== this.selectedStudent1Id())
      .map(student => this.mapUserToOption(student))
  );

  readonly codirectorOptions = computed<SelectOption[]>(() =>
    this.availableTeachers().map(teacher => this.mapUserToOption(teacher))
  );

  readonly advisorOptions = computed<SelectOption[]>(() =>
    this.availableAdvisors().map(advisor => this.mapUserToOption(advisor))
  );

  constructor() {
    this.setupDynamicLogic();
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
      });

    this.form.get('student1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.selectedStudent1Id.set(id ?? '');
        if (this.form.get('student2')?.value === id) {
          this.form.get('student2')?.setValue('');
        }
      });
  }

  initForCreate(): void {
    this.currentProposalId.set(null);
    this.form.reset();
    CAMPOS_PARTICIPANTES.forEach(campo => this.form.get(campo)?.enable({ emitEvent: false }));
  }

  initForEdit(proposal: Proposal): void {
    this.currentProposalId.set(proposal.id ?? null);
    const student1 = proposal.authors[0]?.id ?? '';
    this.selectedStudent1Id.set(student1);
    const objetivos = proposal.objectives?.length ? proposal.objectives : [proposal.description];
    const descripcion = proposal.description !== objetivos[0] ? proposal.description : '';

    this.form.patchValue({
      title: proposal.title,
      description: objetivos[0] ?? '',
      specificObjectives: objetivos.slice(1).join('\n'),
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
   * específicos (uno por línea); la descripción es opcional.
   */
  buildProposalPayload(originalProposal: Proposal | null, attachments: ProposalAttachments): Proposal | null {
    const raw = this.form.getRawValue();
    const currentDirector = this.authService.currentUser();

    if (!currentDirector) return null;

    const objetivos = [raw.description, ...raw.specificObjectives.split('\n')]
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
