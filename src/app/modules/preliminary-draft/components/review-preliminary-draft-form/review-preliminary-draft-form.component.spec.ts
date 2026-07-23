import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { ReviewPreliminaryDraftFormComponent } from './review-preliminary-draft-form.component';
import { ReviewPreliminaryDraftFormFacadeService } from './services/review-preliminary-draft-form-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { signal } from '@angular/core';

describe('ReviewPreliminaryDraftFormComponent', () => {
  let component: ReviewPreliminaryDraftFormComponent;
  let fixture: ComponentFixture<ReviewPreliminaryDraftFormComponent>;
  let componentRef: ComponentRef<ReviewPreliminaryDraftFormComponent>;
  let mockFacade: jest.Mocked<Partial<ReviewPreliminaryDraftFormFacadeService>>;

  const mockDraft = { id: 'draft-1', proposalData: {} } as unknown as PreliminaryDraft;

  beforeEach(async () => {
    mockFacade = {
      draft: signal(null),
      validateAndGetPayload: jest.fn(),
      // Mock de señales y metodos usados en el HTML
      isReadOnly: signal(false),
      documentUploadDate: signal('01/01/2026'),
      currentDocument: signal(null),
      uploadedSignedFile: signal(null),
      uploadedAnnotatedFile: signal(null),
      isUploadModalOpen: signal(false),
      isAnnotatedUploadModalOpen: signal(false),
      getStudentNames: jest.fn().mockReturnValue(''),
      getDirectorName: jest.fn().mockReturnValue(''),
      getCodirectorName: jest.fn().mockReturnValue(''),
      getAdvisorName: jest.fn().mockReturnValue(''),
      isFieldInvalid: jest.fn().mockReturnValue(false),
      evaluationForm: { touched: false, get: jest.fn() } as any
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPreliminaryDraftFormComponent]
    })
    .overrideComponent(ReviewPreliminaryDraftFormComponent, {
      set: {
        providers: [{ provide: ReviewPreliminaryDraftFormFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPreliminaryDraftFormComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    // Seteamos el input.required()
    componentRef.setInput('preliminaryDraft', mockDraft);
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería actualizar el draft del facade cuando cambia el input preliminaryDraft', () => {
    fixture.detectChanges(); // Dispara los effects

    expect(mockFacade.draft!()).toEqual(mockDraft);
  });

  describe('submit()', () => {
    it('debería emitir onSaveEvaluation si validateAndGetPayload retorna el payload', () => {
      const mockPayload = { formValues: {}, file: new File([''], 'doc.pdf') };
      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(mockPayload);

      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(emitSpy).toHaveBeenCalledWith(mockPayload);
    });

    it('NO debería emitir onSaveEvaluation si validateAndGetPayload retorna null', () => {
      (mockFacade.validateAndGetPayload as jest.Mock).mockReturnValue(null);

      const emitSpy = jest.spyOn(component.onSaveEvaluation, 'emit');

      component.submit();

      expect(emitSpy).not.toHaveBeenCalled();
    });
  });
});
