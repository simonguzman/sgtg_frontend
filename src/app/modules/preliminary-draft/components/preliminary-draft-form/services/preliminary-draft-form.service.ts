import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ProposalService } from '../../../../proposal/services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';

import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { SelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { User } from '../../../../users/interfaces/user.interface';

@Injectable()
export class PreliminaryDraftFormService {
  private readonly fb = inject(FormBuilder);
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  readonly form = this.fb.group({
    proposalId: ['', Validators.required],
    title: ['', Validators.required],
    description: ['', Validators.required],
    document: [null as File | FileDocument | null, Validators.required]
  });

  readonly selectedProposalId = signal<string>('');
  readonly currentPreliminaryDraftId = signal<string | null>(null);

  readonly availableProposals = computed(() => {
    const allProposals = this.proposalService.proposals();
    const currentUser = this.authService.currentUser();
    const existingPreliminaryDrafts = this.preliminaryDraftService.preliminaryDrafts();
    const activeDraftId = this.currentPreliminaryDraftId();

    return allProposals.filter(proposal => {
      if (activeDraftId && proposal.id === this.form.get('proposalId')?.value) return true;
      const isApproved = proposal.state === stateList.APROBADO || proposal.state === stateList.APROBADO_CON_OBSERVACIONES;
      const isDirector = proposal.director?.id === currentUser?.id;
      const isAlreadyRegistered = existingPreliminaryDrafts.some(draft => draft.proposalId === proposal.id);

      return isApproved && isDirector && !isAlreadyRegistered;
    });
  });

  readonly selectedProposal = computed(() => {
    const id = this.selectedProposalId();
    return this.availableProposals().find(proposal => proposal.id === id) || null;
  });

  readonly proposalEvaluationDocument = computed(() => {
    const proposal = this.selectedProposal();
    if (!proposal?.evaluations?.length) return null;

    const approvedEvaluation = [...proposal.evaluations]
      .reverse()
      .find(evaluation =>
        evaluation.veredict === stateList.APROBADO ||
        evaluation.veredict === stateList.APROBADO_CON_OBSERVACIONES
      );

    const fileName = approvedEvaluation?.signedDocuments?.[0];
    if (!fileName) return null;

    const isString = typeof fileName === 'string';
    return {
      name: isString ? fileName : (fileName as unknown as FileDocument).name,
      url: isString ? '' : (fileName as unknown as FileDocument).url
    };
  });

  readonly proposalOptions = computed<SelectOption[]>(() =>
    this.availableProposals().map(proposal => ({
      id: proposal.id!,
      label: proposal.title
    }))
  );

  constructor() {
    this.setupDynamicLogic();
  }

  private setupDynamicLogic(): void {
    this.form.get('proposalId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.selectedProposalId.set(id ?? ''));
  }

  initForCreate(): void {
    this.currentPreliminaryDraftId.set(null);
    this.form.reset();
    this.form.get('title')?.disable();
    this.form.get('description')?.disable();
  }

  initForEdit(preliminaryDraft: PreliminaryDraft): void {
    this.currentPreliminaryDraftId.set(preliminaryDraft.preliminaryDraftId ?? null);
    this.selectedProposalId.set(preliminaryDraft.proposalId);

    this.form.get('title')?.enable();
    this.form.get('description')?.enable();

    this.form.patchValue({
      proposalId: preliminaryDraft.proposalId,
      title: preliminaryDraft.proposalData.title,
      description: preliminaryDraft.proposalData.description
    });

    this.form.get('document')?.clearValidators();
    this.form.updateValueAndValidity();
  }

  buildPreliminaryDraftPayload(originalPreliminaryDraft: PreliminaryDraft | null, documents: FileDocument[]): PreliminaryDraft | null {
    const proposal = this.selectedProposal();
    if (!proposal) return null;

    const isEdit = !!originalPreliminaryDraft;

    return {
      ...(originalPreliminaryDraft ?? undefined),
      proposalId: proposal.id!,
      proposalData: {
        ...proposal,
        title: (isEdit ? this.form.get('title')?.value : proposal.title) ?? '',
        description: (isEdit ? this.form.get('description')?.value : proposal.description) ?? ''
      },
      documents: documents.length > 0 ? documents : (originalPreliminaryDraft?.documents || []),
      state: originalPreliminaryDraft?.state || stateList.EN_REVISION,
      createdData: originalPreliminaryDraft?.createdData || new Date(),
      evaluations: originalPreliminaryDraft?.evaluations || []
    } as PreliminaryDraft;
  }

  getMemberName(user: User | undefined): string {
    if (!user) return 'No asignado';
    return [user.firstName, user.secondName, user.lastName, user.secondLastName]
      .filter(namePart => !!namePart)
      .join(' ');
  }

  getAuthorsNames(authors: User[] | undefined): string {
    return this.userService.getAuthorsNames(authors);
  }
}
