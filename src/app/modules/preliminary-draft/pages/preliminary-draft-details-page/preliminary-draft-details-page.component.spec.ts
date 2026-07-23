import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';

import { PreliminaryDraftDetailsPageComponent } from './preliminary-draft-details-page.component';
import { PreliminaryDraftDetailsPageService } from './services/preliminary-draft-details-page.service';
import { PreliminaryDraft } from '../../interfaces/preliminary-draft.interface';

describe('PreliminaryDraftDetailsPageComponent', () => {
  let component: PreliminaryDraftDetailsPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftDetailsPageComponent>;

  // Estructura estricta para mockear el servicio inyectado a nivel de componente
  let mockPageService: {
    init: jest.Mock;
    goBack: jest.Mock;
    navigateToEvaluations: jest.Mock;
    navigateToDocuments: jest.Mock;
    downloadDocument: jest.Mock;
    getMemberName: jest.Mock;
    getAuthors: jest.Mock;
    preliminaryDraftDetails: WritableSignal<PreliminaryDraft | null>; // <-- Corregido aquí
    mainDocument: WritableSignal<any>;
  };

  beforeEach(async () => {
    mockPageService = {
      init: jest.fn(),
      goBack: jest.fn(),
      navigateToEvaluations: jest.fn(),
      navigateToDocuments: jest.fn(),
      downloadDocument: jest.fn(),
      getMemberName: jest.fn().mockReturnValue('Juan Perez'),
      getAuthors: jest.fn().mockReturnValue('Maria Gomez'),
      preliminaryDraftDetails: signal(null), // <-- Corregido aquí
      mainDocument: signal(null)
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftDetailsPageComponent]
    })
    // Sobrescribimos el proveedor del componente porque está inyectado directamente en sus metadatos
    .overrideProvider(PreliminaryDraftDetailsPageService, { useValue: mockPageService })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftDetailsPageComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse e inicializar el servicio en ngOnInit', () => {
    fixture.detectChanges(); // Esto dispara ngOnInit

    expect(component).toBeTruthy();
    expect(mockPageService.init).toHaveBeenCalled();
  });

  it('debería mostrar mensaje de carga cuando no hay detalles', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Cargando información del anteproyecto...');
  });

  it('debería renderizar la información cuando existen detalles del anteproyecto', () => {
    const mockDraft = {
      state: 'EN_REVISION',
      proposalData: {
        title: 'Titulo Test',
        description: 'Desc Test',
        modality: 'Trabajo',
        director: { id: 'd1' },
        authors: [{ id: 'a1' }]
      }
    } as unknown as PreliminaryDraft;

    mockPageService.preliminaryDraftDetails.set(mockDraft); // <-- Corregido aquí
    mockPageService.mainDocument.set({ name: 'Documento_Final.pdf' });

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).not.toContain('Cargando información del anteproyecto...');
    expect(compiled.textContent).toContain('Titulo Test');
    expect(compiled.textContent).toContain('Desc Test');
    expect(compiled.textContent).toContain('Documento_Final.pdf');
    expect(mockPageService.getAuthors).toHaveBeenCalled();
    expect(mockPageService.getMemberName).toHaveBeenCalled();
  });
});
