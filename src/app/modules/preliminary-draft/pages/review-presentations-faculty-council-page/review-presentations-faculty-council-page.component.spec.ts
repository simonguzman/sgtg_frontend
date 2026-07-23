import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';

import { ReviewPresentationsFacultyCouncilPageComponent } from './review-presentations-faculty-council-page.component';
import { ReviewPresentationsFacultyCouncilPageFacadeService } from './services/review-presentations-faculty-council-page-facade.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';
import { SaveEvaluationPayload } from '../../components/review-presentations-faculty-council-form/models/council-evaluation.model';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

describe('ReviewPresentationsFacultyCouncilPageComponent', () => {
  let component: ReviewPresentationsFacultyCouncilPageComponent;
  let fixture: ComponentFixture<ReviewPresentationsFacultyCouncilPageComponent>;
  let mockFacade: jest.Mocked<Partial<ReviewPresentationsFacultyCouncilPageFacadeService>>;

  // Solución: Agregar evaluations: [] al mock para que el componente hijo no colapse
  const mockDraft = {
    id: 'draft-1',
    documents: [],
    evaluations: []
  } as unknown as PreliminaryDraft;

  beforeEach(async () => {
    mockFacade = {
      filteredPreliminaryDraft: signal(mockDraft),
      isConfirmModalOpen: signal(false),

      loadData: jest.fn(),
      goBack: jest.fn(),
      handleRequestConfirmation: jest.fn(),
      processCouncilDecision: jest.fn(),
      downloadFile: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ReviewPresentationsFacultyCouncilPageComponent]
    })
    .overrideComponent(ReviewPresentationsFacultyCouncilPageComponent, {
      set: {
        providers: [
          { provide: ReviewPresentationsFacultyCouncilPageFacadeService, useValue: mockFacade }
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(ReviewPresentationsFacultyCouncilPageComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente y ejecutar loadData en ngOnInit', () => {
    fixture.detectChanges();

    expect(component).toBeTruthy();
    expect(mockFacade.loadData).toHaveBeenCalled();
  });

  it('debería invocar goBack del facade al hacer click en el botón de regresar', () => {
    fixture.detectChanges();
    const backButton = fixture.nativeElement.querySelector('button');
    backButton.click();

    expect(mockFacade.goBack).toHaveBeenCalled();
  });

  // Validaciones de eventos delegados a la vista
  describe('Interacciones con Componentes Hijos', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('debería delegar el evento onSaveEvaluation al facade', () => {
      const mockPayload = {} as SaveEvaluationPayload;
      // Simulamos la llamada como si viniera del HTML
      component.facade.handleRequestConfirmation(mockPayload);
      expect(mockFacade.handleRequestConfirmation).toHaveBeenCalledWith(mockPayload);
    });

    it('debería delegar el evento onDownloadFile al facade', () => {
      const mockFile = {} as FileDocument;
      component.facade.downloadFile(mockFile);
      expect(mockFacade.downloadFile).toHaveBeenCalledWith(mockFile);
    });

    it('debería delegar confirmación del modal al processCouncilDecision', () => {
      component.facade.processCouncilDecision();
      expect(mockFacade.processCouncilDecision).toHaveBeenCalled();
    });
  });
});
