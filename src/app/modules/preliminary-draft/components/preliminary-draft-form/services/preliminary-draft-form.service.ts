import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProposalService } from '../../../../proposal/services/proposal.service';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { PreliminaryDraftService } from '../../../services/preliminary-draft.service';
import { UserService } from '../../../../users/services/user.service';
import { PreliminaryDraft } from '../../../interfaces/preliminary-draft.interface';
import { SelectOption } from '../../../../../shared/components/searchable-select/searchable-select.component';
import { stateList } from '../../../../../core/enums/state.enum';
import { FileDocument } from '../../../../../core/interfaces/file-document.interface';
import { FormattedDocument } from '../../../../../core/interfaces/formatted-document.interface';
import { User } from '../../../../users/interfaces/user.interface';
import { Proposal } from '../../../../proposal/interfaces/proposal.interface';
import { proposalContent } from '../../../../../shared/components/work-details/work-details.builder';

@Injectable()
export class PreliminaryDraftFormService {
  private readonly fb = inject(FormBuilder);
  private readonly proposalService = inject(ProposalService);
  private readonly authService = inject(AuthService);
  private readonly preliminaryDraftService = inject(PreliminaryDraftService);
  private readonly userService = inject(UserService);
  private readonly destroyRef = inject(DestroyRef);

  /** Al corregir el anteproyecto se editan los datos del proyecto; al registrarlo solo se muestran */
  readonly form = this.fb.group({
    proposalId: ['', Validators.required],
    title: ['', Validators.required],
    generalObjective: ['', Validators.required],
    specificObjectives: this.fb.array<FormControl<string>>([]),
    description: [''],
    lineOfResearch: [''],
    document: [null as File | FileDocument | null, Validators.required]
  });

  private readonly editableFields = ['title', 'generalObjective', 'specificObjectives', 'description', 'lineOfResearch'];

  readonly selectedProposalId = signal<string>('');
  readonly currentPreliminaryDraftId = signal<string | null>(null);

  readonly availableProposals = computed(() => {
    const allProposals = this.proposalService.proposals();
    const currentUser = this.authService.currentUser();
    const existingPreliminaryDrafts = this.preliminaryDraftService.preliminaryDrafts();
    const activeDraftId = this.currentPreliminaryDraftId();
    return allProposals.filter(proposal => {
      if (activeDraftId && proposal.id === this.form.get('proposalId')?.value) return true;
      // Solo las propuestas con concepto pertinente del Comité pasan a anteproyecto
      const isPertinent = proposal.state === stateList.PERTINENTE;
      const isDirector = proposal.director?.id === currentUser?.id;
      const isAlreadyRegistered = existingPreliminaryDrafts.some(draft => draft.proposalId === proposal.id);
      return isPertinent && isDirector && !isAlreadyRegistered;
    });
  });

  readonly selectedProposal = computed(() => {
    const id = this.selectedProposalId();
    return this.availableProposals().find(proposal => proposal.id === id) || null;
  });

  readonly proposalEvaluationDocument = computed<FormattedDocument | null>(() => {
    const proposal = this.selectedProposal();
    if (!proposal?.evaluations?.length) return null;
    const approvedEvaluation = [...proposal.evaluations]
      .reverse()
      .find(evaluation =>
        evaluation.veredict === stateList.PERTINENTE
      );
    return approvedEvaluation?.signedDocuments?.[0] ?? null;
  });

  readonly proposalOptions = computed<SelectOption[]>(() =>
    this.availableProposals().map(proposal => ({ id: proposal.id!, label: proposal.title }))
  );

  constructor() {
    this.setupDynamicLogic();
  }

  private setupDynamicLogic(): void {
    this.form.get('proposalId')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => this.selectedProposalId.set(id ?? ''));
  }

  get specificObjectives(): FormArray<FormControl<string>> {
    return this.form.controls.specificObjectives;
  }

  addSpecificObjective(value = ''): void {
    this.specificObjectives.push(this.fb.nonNullable.control(value));
  }

  removeSpecificObjective(index: number): void {
    if (this.specificObjectives.length > 1) this.specificObjectives.removeAt(index);
  }

  initForCreate(): void {
    this.currentPreliminaryDraftId.set(null);
    this.form.reset();
    this.specificObjectives.clear();
    this.editableFields.forEach(field => this.form.get(field)?.disable());
  }

  /**
   * Corrección: el título, los objetivos, la descripción y la línea de
   * investigación se pueden corregir (como en la propuesta); el documento
   * vigente queda cargado y solo uno nuevo se radica como nueva versión.
   */
  initForEdit(preliminaryDraft: PreliminaryDraft): void {
    this.currentPreliminaryDraftId.set(preliminaryDraft.preliminaryDraftId ?? null);
    this.selectedProposalId.set(preliminaryDraft.proposalId);
    const registered = proposalContent(preliminaryDraft.proposalData);
    this.editableFields.forEach(field => this.form.get(field)?.enable());
    this.specificObjectives.clear();
    (registered.specificObjectives.length ? registered.specificObjectives : [''])
      .forEach(objective => this.addSpecificObjective(objective));
    this.form.patchValue({
      proposalId: preliminaryDraft.proposalId,
      title: preliminaryDraft.proposalData.title,
      generalObjective: registered.generalObjective ?? '',
      description: registered.description ?? '',
      lineOfResearch: registered.lineOfResearch ?? ''
    });
    this.form.get('document')?.clearValidators();
    this.form.updateValueAndValidity();
  }

  /**
   * Arma el anteproyecto para el backend: el trabajo con sus datos (corregidos
   * al editar) y el PDF que se radica como nueva versión (null si no se cargó
   * uno nuevo).
   */
  buildPreliminaryDraftPayload(originalPreliminaryDraft: PreliminaryDraft | null, attachment: File | null): PreliminaryDraft | null {
    const proposal = this.selectedProposal();
    if (!proposal) return null;

    return {
      ...(originalPreliminaryDraft ?? undefined),
      proposalId: proposal.id!,
      proposalData: originalPreliminaryDraft ? this.correctedProposal(proposal) : proposal,
      documents: originalPreliminaryDraft?.documents ?? [],
      attachment,
      state: originalPreliminaryDraft?.state || stateList.EN_REVISION,
      createdData: originalPreliminaryDraft?.createdData || new Date(),
      evaluations: originalPreliminaryDraft?.evaluations || []
    } as PreliminaryDraft;
  }

  /** La propuesta con los datos del formulario; el primer objetivo es el general y la descripción es opcional. */
  private correctedProposal(proposal: Proposal): Proposal {
    const raw = this.form.getRawValue();
    const objectives = [raw.generalObjective ?? '', ...raw.specificObjectives]
      .map(objective => objective.trim())
      .filter(Boolean);
    return {
      ...proposal,
      title: (raw.title ?? '').trim(),
      objectives,
      description: raw.description?.trim() || objectives[0],
      lineOfResearch: raw.lineOfResearch?.trim() || undefined
    };
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
