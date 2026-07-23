import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreliminaryDraftEditPageComponent } from './preliminary-draft-edit-page.component';
import { PreliminaryDraftEditPageService } from './services/preliminary-draft-edit-page.service';
import { signal } from '@angular/core';

describe('PreliminaryDraftEditPageComponent', () => {
  let component: PreliminaryDraftEditPageComponent;
  let fixture: ComponentFixture<PreliminaryDraftEditPageComponent>;
  let mockPageService: jest.Mocked<Partial<PreliminaryDraftEditPageService>>;

  beforeEach(async () => {
    mockPageService = {
      init: jest.fn(),
      goBack: jest.fn(),
      handleUpdate: jest.fn(),
      cancelUpdate: jest.fn(),
      confirmUpdate: jest.fn(),
      preliminaryDraftToEdit: signal(null),
      confirmState: signal({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftEditPageComponent]
    })
    .overrideComponent(PreliminaryDraftEditPageComponent, {
      set: {
        providers: [{ provide: PreliminaryDraftEditPageService, useValue: mockPageService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftEditPageComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería iniciar la carga de datos al inicializar (ngOnInit)', () => {
    fixture.detectChanges(); // Ejecuta ngOnInit

    expect(mockPageService.init).toHaveBeenCalled();
  });
});
