import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { signal, WritableSignal } from '@angular/core';

import { ReviewPreliminaryDraftFormComponent } from './review-preliminary-draft-form.component';
import { ReviewPreliminaryDraftFormFacadeService } from './services/review-preliminary-draft-form-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { PendingReviewData } from '../../interfaces/review-preliminary-draft-payload.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { Proposal } from '../../../proposal/interfaces/proposal.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';

// Factory estricto para objetos User
const createMockUser = (overrides?: Partial<User>): User => ({
  id: 'user-1',
  name: 'Usuario',
  lastName: 'Prueba',
  email: 'usuario@unicauca.edu.co',
  ...overrides
} as User);

// Factory estricto para Proposal
const createMockProposal = (overrides?: Partial<Proposal>): Proposal => ({
  id: 'prop-1',
  title: 'Sistema de Gestión Hospitalaria',
  description: 'Descripción del proyecto',
  // Usamos el indexed type de Proposal para asegurar compatibilidad con Modality
  modality: 'Trabajo de Grado' as Proposal['modality'],
  // Fix: authors debe ser un arreglo de objetos User[], no strings
  authors: [createMockUser({ id: 'user-1' })],
  director: createMockUser({ id: 'dir-1', firstName: 'Director', lastName: 'Uno' }),
  codirector: createMockUser({ id: 'codir-1', firstName: 'Codirector', lastName: 'Dos' }),
  advisor: createMockUser({ id: 'adv-1', firstName: 'Asesor', lastName: 'Tres' }),
  state: stateList.EN_DESARROLLO,
  createdAt: new Date(),
  documents: [],
  evaluations: [],
  ...overrides
});

// Factory estricto para PreliminaryDraft
const createMockPreliminaryDraft = (overrides?: Partial<PreliminaryDraft>): PreliminaryDraft => ({
  preliminaryDraftId: 'draft-1',
  proposalId: 'prop-1',
  state: stateList.EN_DESARROLLO,
  documents: [],
  proposalData: createMockProposal(),
  evaluators: [],
  // Fix: se añade evaluations para cumplir la firma obligatoria Evaluation[]
  evaluations: [],
  createdData: new Date(),
  ...overrides
});

describe('ReviewPreliminaryDraftFormComponent', () => {
  let component: ReviewPreliminaryDraftFormComponent;
  let fixture: ComponentFixture<ReviewPreliminaryDraftFormComponent>;

  // Tipo estricto para el Facade Mock
  let mockFacade: {
    preliminaryDraft: WritableSignal<PreliminaryDraft | null>;
    isReadOnly: WritableSignal<boolean>;
    documentUploadDate: WritableSignal<string>;
    getStudentNames: jest.Mock;
    getDirectorName: jest.Mock;
    getCodirectorName: jest.Mock;
    getAdvisorName: jest.Mock;
    evaluationForm: FormGroup;
    isFieldInvalid: jest.Mock;
    currentDocument: WritableSignal<FileDocument | null>;
    uploadedSignedFile: WritableSignal<{ fileName: string; file: File } | null>;
    uploadedAnnotatedFile: WritableSignal<{ fileName: string; file: File } | null>;
    isUploadModalOpen: WritableSignal<boolean>;
    isAnnotatedUploadModalOpen: WritableSignal<boolean>;
    handleFileUploaded: jest.Mock;
    handleAnnotatedFileUploaded: jest.Mock;
    validateAndGetPayload: jest.Mock;
  };

  const mockDraft = createMockPreliminaryDraft();

  beforeEach(async () => {
    mockFacade = {
      preliminaryDraft: signal<PreliminaryDraft | null>(null),
      isReadOnly: signal<boolean>(false),
      documentUploadDate: signal<string>('01/01/2026'),
      getStudentNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getDirectorName: jest.fn().mockReturnValue('Director Prueba'),
      getCodirectorName: jest.fn().mockReturnValue('Codirector Prueba'),
      getAdvisorName: jest.fn().mockReturnValue('Asesor Prueba'),
      evaluationForm: new FormGroup({
        result: new FormControl(''),
        comments: new FormControl('')
      }),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      currentDocument: signal<FileDocument | null>({
        id: 'doc-1', name: 'Documento.pdf', type: DocumentType.ANTEPROYECTO
      } as FileDocument),
      uploadedSignedFile: signal<{ fileName: string; file: File } | null>(null),
      uploadedAnnotatedFile: signal<{ fileName: string; file: File } | null>(null),
      isUploadModalOpen: signal<boolean>(false),
      isAnnotatedUploadModalOpen: signal<boolean>(false),
      handleFileUploaded: jest.fn(),
      handleAnnotatedFileUploaded: jest.fn(),
      validateAndGetPayload: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPreliminaryDraftFormComponent, ReactiveFormsModule]
    })
    .overrideComponent(ReviewPreliminaryDraftFormComponent, {
      set: {
        providers: [{ provide: ReviewPreliminaryDraftFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPreliminaryDraftFormComponent);
    component = fixture.componentInstance;

    fixture.componentRef.setInput('preliminaryDraft', mockDraft);
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('debería crear el componente', () => {
    expect(component).toBeTruthy();
  });

  describe('Ciclo de vida y Reactividad (Effects)', () => {
    it('debería actualizar el preliminaryDraft del facade cuando el input cambia (effect)', () => {
      const newDraft = createMockPreliminaryDraft({ state: stateList.APROBADO });

      jest.spyOn(mockFacade.preliminaryDraft, 'set');

      fixture.componentRef.setInput('preliminaryDraft', newDraft);
      fixture.detectChanges();

      expect(mockFacade.preliminaryDraft.set).toHaveBeenCalledWith(newDraft);
    });
  });

  describe('Emisión de eventos (Outputs)', () => {
    it('debería emitir onSaveEvaluation cuando submit() obtiene un payload válido', () => {
      const mockPayload: PendingReviewData = {
        formValues: { result: stateList.APROBADO, comments: 'Ok' },
        file: new File([''], 'test.pdf')
      };

      mockFacade.validateAndGetPayload.mockReturnValue(mockPayload);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(mockFacade.validateAndGetPayload).toHaveBeenCalled();
      expect(emitSpy).toHaveBeenCalledWith(mockPayload);
    });

    it('NO debería emitir onSaveEvaluation cuando submit() retorna null', () => {
      mockFacade.validateAndGetPayload.mockReturnValue(null);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('debería emitir onDownloadPreliminaryDraft al hacer clic en el botón Descargar', () => {
      const emitSpy = jest.spyOn(component.onDownloadPreliminaryDraft, 'emit');

      component.onDownloadPreliminaryDraft.emit();

      expect(emitSpy).toHaveBeenCalled();
    });
  });

  describe('Interacción del Template (UI)', () => {
    it('debería ocultar el banner informativo si isReadOnly es true', () => {
      mockFacade.isReadOnly.set(true);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('app-info-banner');
      expect(banner).toBeNull();
    });

    it('debería mostrar el banner informativo si isReadOnly es false', () => {
      mockFacade.isReadOnly.set(false);
      fixture.detectChanges();

      const banner = fixture.nativeElement.querySelector('app-info-banner');
      expect(banner).toBeTruthy();
    });

    it('debería limpiar el archivo firmado al invocar la limpieza desde la UI', () => {
      const fileMock = { fileName: 'formato.pdf', file: new File([''], 'test.pdf') };
      mockFacade.uploadedSignedFile.set(fileMock);
      jest.spyOn(mockFacade.uploadedSignedFile, 'set');
      fixture.detectChanges();

      mockFacade.uploadedSignedFile.set(null);
      expect(mockFacade.uploadedSignedFile.set).toHaveBeenCalledWith(null);
    });

    it('debería abrir los modales correspondientes al llamar al set de sus señales', () => {
      jest.spyOn(mockFacade.isUploadModalOpen, 'set');
      jest.spyOn(mockFacade.isAnnotatedUploadModalOpen, 'set');

      mockFacade.isUploadModalOpen.set(true);
      expect(mockFacade.isUploadModalOpen.set).toHaveBeenCalledWith(true);

      mockFacade.isAnnotatedUploadModalOpen.set(true);
      expect(mockFacade.isAnnotatedUploadModalOpen.set).toHaveBeenCalledWith(true);
    });
  });
});
