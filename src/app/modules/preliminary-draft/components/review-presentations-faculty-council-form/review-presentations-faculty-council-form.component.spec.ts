import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef, signal } from '@angular/core';
import { FormGroup, FormControl } from '@angular/forms';
import { ReviewPresentationsFacultyCouncilFormComponent } from './review-presentations-faculty-council-form.component';
import { ReviewPresentationsFacultyCouncilFormFacadeService } from './services/review-presentations-faculty-council-form-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { SaveEvaluationPayload } from './models/council-evaluation.model';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

describe('ReviewPresentationsFacultyCouncilFormComponent', () => {
  let component: ReviewPresentationsFacultyCouncilFormComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilFormComponent>;
  let componentRef: ComponentRef<ReviewPresentationsFacultyCouncilFormComponent>;
  let mockFacade: jest.Mocked<Partial<ReviewPresentationsFacultyCouncilFormFacadeService>>;

  const mockDraft = { id: 'draft-1', proposalData: {} } as unknown as PreliminaryDraft;

  beforeEach(async () => {
    mockFacade = {
      draft: signal<PreliminaryDraft | null>(null),
      uploadedSignedFile: signal(null),
      isUploadModalOpen: signal(false),

      isReadOnly: signal(false),
      signedProposalDocument: signal(undefined),
      approvedPreliminaryDraftDocument: signal(undefined),
      presentationDocument: signal(undefined),
      evaluationFiles: signal([]),
      documentUploadDate: signal('23/07/2026'),

      // Ahora enviamos una instancia real para satisfacer la directiva [formGroup]
      evaluationForm: new FormGroup({
        result: new FormControl(''),
        comments: new FormControl(''),
        maximumDeliveryDate: new FormControl(null),
        document: new FormControl(null)
      }) as unknown as FormGroup,

      initFormEffects: jest.fn(),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      handleFileUploaded: jest.fn(),
      validateAndGetPayload: jest.fn(),
      getStudentNames: jest.fn().mockReturnValue('Estudiante Prueba'),
      getDirectorName: jest.fn().mockReturnValue('Director Prueba'),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue('')
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilFormComponent]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilFormComponent, {
      set: {
        providers: [
          { provide: ReviewPresentationsFacultyCouncilFormFacadeService, useValue: mockFacade }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('preliminaryDraft', mockDraft);
  });

  it('debería crearse correctamente y ejecutar initFormEffects en ngOnInit', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockFacade.initFormEffects).toHaveBeenCalled();
  });

  it('debería sincronizar el input preliminaryDraft con el signal draft del facade', () => {
    fixture.detectChanges();

    expect(mockFacade.draft!()).toEqual(mockDraft);
  });

  describe('submit() y Outputs', () => {
    it('debería emitir onSaveEvaluation si el facade valida correctamente (payload no nulo)', () => {
      const mockPayload: SaveEvaluationPayload = {
        formValues: { result: 'Aprobado', comments: '', maximumDeliveryDate: null, document: null },
        file: new File([''], 'test.pdf')
      };

      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(mockPayload);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith(mockPayload);
    });

    it('NO debería emitir onSaveEvaluation si la validación falla (payload nulo)', () => {
      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(null);
      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });

  describe('Template interacciones (Descargas)', () => {
    it('debería emitir onDownloadFile al invocar el output desde la vista', () => {
      const emitSpy = jest.spyOn(component.onDownloadFile, 'emit');
      const mockDoc = { id: 'doc-1', name: 'Documento' } as FileDocument;

      component.onDownloadFile.emit(mockDoc);

      expect(emitSpy).toHaveBeenCalledWith(mockDoc);
    });
  });
});
