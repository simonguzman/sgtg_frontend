import { Component, computed, inject, input, OnInit, Output, EventEmitter, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { User } from '../../../users/interfaces/user.interface';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';

import { NotificationType } from '../../../../shared/components/notifications/models/notification.model';
import { UserRoleType } from '../../../../core/enums/user-role-type.enum';
import { UserService } from '../../../users/services/user.service';
import { PreliminaryDraftService } from '../../services/preliminary-draft.service';
import { NotificationService } from '../../../../shared/components/notifications/services/notification.service';

import { ButtonComponent } from "../../../../shared/components/button-component/button-component.component";
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';
import { SelectOption, SearchableSelectComponent } from '../../../../shared/components/searchable-select/searchable-select.component';

@Component({
  selector: 'app-assign-evaluators-form',
  imports: [ReactiveFormsModule, ButtonComponent, NgTemplateOutlet, DatePipe, InfoBannerComponent, SearchableSelectComponent],
  providers: [DatePipe],
  templateUrl: './assign-evaluators-form.component.html',
  styleUrls: ['./assign-evaluators-form.component.css']
})
export class AssignEvaluatorsFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly notificationService = inject(NotificationService);
  private readonly destroyRef = inject(DestroyRef);

  preliminaryDraft = input.required<PreliminaryDraft>();
  @Output() onSave = new EventEmitter<{ ev1: string, ev2: string }>();

  private readonly firstEvaluatorSelectedId = signal<string>('');

  readonly form = this.fb.group({
    evaluator1: ['', Validators.required],
    evaluator2: ['', Validators.required]
  });

  availableEvaluators = computed(() => {
    const allUsers = this.userService.users();
    const currentPreliminaryDraft = this.preliminaryDraft();
    if (!currentPreliminaryDraft.proposalData) return [];
    const data = currentPreliminaryDraft.proposalData;
    const forbiddenIds = new Set<string>();
    if (data.director?.id) forbiddenIds.add(data.director.id);
    if (data.codirector?.id) forbiddenIds.add(data.codirector.id);
    if (data.advisor?.id) forbiddenIds.add(data.advisor.id);
    data.authors?.forEach(auth => {
      const id = typeof auth === 'string' ? auth : (auth as any)?.id;
      if (id) forbiddenIds.add(id);
    });
    return allUsers.filter(user => {
      const isDocente = user.roles?.includes(UserRoleType.DOCENTE);
      const isNotParticipant = !forbiddenIds.has(user.id);
      const hasConflictRole = user.roles?.some(role =>
        role === UserRoleType.JEFE_DEP || role === UserRoleType.CONSEJO
      );
      return isDocente && isNotParticipant && !hasConflictRole;
    });
  });

  protected filteredEvaluatorsForE2 = computed(() => {
    const available = this.availableEvaluators();
    const firstId = this.firstEvaluatorSelectedId();
    return available.filter(user => user.id !== firstId);
  });

  protected evaluator1Options = computed<SelectOption[]>(() =>
    this.availableEvaluators().map(user => ({
      id: user.id!,
      label: this.getMemberFullName(user)
    }))
  );

  protected evaluator2Options = computed<SelectOption[]>(() =>
    this.filteredEvaluatorsForE2().map(user => ({
      id: user.id!,
      label: this.getMemberFullName(user)
    }))
  );

  ngOnInit(): void {
    this.setupFormSubscriptions();
  }

  private setupFormSubscriptions(): void {
    this.form.get('evaluator1')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((id: string | null) => {
        const selectedId = id || '';
        this.firstEvaluatorSelectedId.set(selectedId);
        if (this.form.get('evaluator2')?.value === selectedId) {
          this.form.get('evaluator2')?.setValue('');
        }
      });
  }

  getMemberFullName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(namePart => !!namePart)
      .join(' ');
  }

  getAuthorsNames(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors) || 'No asignado';
  }

  isFieldInvalid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.invalid && control?.touched);
  }

  isFieldValid(fieldName: string): boolean {
    const control = this.form.get(fieldName);
    return !!(control?.valid && control?.touched);
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificationService.show({
        title: 'Formulario incompleto',
        message: 'Debe seleccionar ambos evaluadores antes de continuar.',
        type: NotificationType.ERROR
      });
      return;
    }
    const { evaluator1, evaluator2 } = this.form.value;
    const validationError = this.preliminaryDraftService.validateReviewersRules(
      this.preliminaryDraft().proposalData,
      evaluator1!,
      evaluator2!
    );
    if (validationError) {
      this.notificationService.show({
        title: 'Error de validación',
        message: validationError,
        type: NotificationType.ERROR
      });
      return;
    }

    // Emitimos el evento, la página padre se encarga de abrir el modal
    this.onSave.emit({ ev1: evaluator1!, ev2: evaluator2! });
  }
}
