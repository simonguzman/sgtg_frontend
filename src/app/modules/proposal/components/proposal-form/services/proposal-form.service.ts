import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { UserService } from '../../../../users/services/user.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { ProposalService } from '../../../services/proposal.service';

import { Proposal } from '../../../interfaces/proposal.interface';
import { UserState } from '../../../../users/enum/user-state.enum';
import { SelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { UserRoleType } from '../../../../../core/enums/user-role-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';

@Injectable()
export class ProposalFormService {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly proposalService = inject(ProposalService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.nonNullable.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    modality: ['', Validators.required],
    student1: ['', Validators.required],
    student2: [''],
    codirector: [''],
    advisor: ['']
  });

  readonly selectedStudent1Id = signal<string>('');

  readonly modalityOptions: SelectOption[] = [
    { id: 'Practica profesional', label: 'Práctica profesional' },
    { id: 'Trabajo de investigacion', label: 'Trabajo de investigación' }
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

  private setupDynamicLogic(): void {
    this.form.get('modality')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(modality => {
        const advisorControl = this.form.get('advisor');
        if (modality === 'Practica profesional') {
          advisorControl?.setValidators(Validators.required);
        } else {
          advisorControl?.clearValidators();
          advisorControl?.setValue('');
        }
        advisorControl?.updateValueAndValidity();
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
  }

  initForEdit(proposal: Proposal): void {
    this.currentProposalId.set(proposal.id ?? null);
    const student1 = proposal.authors[0]?.id ?? '';
    this.selectedStudent1Id.set(student1);

    this.form.patchValue({
      title: proposal.title,
      description: proposal.description,
      modality: proposal.modality,
      codirector: proposal.codirector?.id ?? '',
      student1: student1,
      student2: proposal.authors[1]?.id ?? '',
      advisor: proposal.advisor?.id ?? ''
    });
  }

  buildProposalPayload(originalProposal: Proposal | null, documents: FileDocument[]): Proposal | null {
    const raw = this.form.getRawValue();
    const currentDirector = this.authService.currentUser();

    if (!currentDirector) return null;

    if (raw.codirector) this.userService.addRoleToUser(raw.codirector, UserRoleType.CODIRECTOR);

    const authorsArray = this.userService.students().filter(student =>
      student.id === raw.student1 || student.id === raw.student2
    );

    return {
      ...(originalProposal ?? undefined),
      title: raw.title,
      description: raw.description,
      modality: raw.modality,
      authors: authorsArray,
      director: currentDirector,
      codirector: this.availableTeachers().find(teacher => teacher.id === raw.codirector),
      advisor: this.availableAdvisors().find(advisor => advisor.id === raw.advisor),
      state: originalProposal?.state ?? stateList.EN_REVISION,
      createdAt: originalProposal?.createdAt ?? new Date(),
      documents: documents,
      evaluations: originalProposal?.evaluations ?? []
    } as Proposal;
  }

  private mapUserToOption(user: User): SelectOption {
    return {
      id: user.id,
      label: `${user.firstName} ${user.secondName || ''} ${user.lastName} ${user.secondLastName || ''}`.replace(/\s+/g, ' ').trim()
    };
  }
}
