import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PreliminaryDraftCreatePageComponent } from './preliminary-draft-create-page.component';
import { PreliminaryDraftCreatePageService } from './services/preliminary-draft-create-page.service';
import { signal } from '@angular/core';

describe('PreliminaryDraftCreatePageComponent', () => {
  let component: PreliminaryDraftCreatePageComponent;
  let fixture: ComponentFixture<PreliminaryDraftCreatePageComponent>;
  let mockPageService: jest.Mocked<Partial<PreliminaryDraftCreatePageService>>;

  beforeEach(async () => {
    mockPageService = {
      checkAccess: jest.fn(),
      goBack: jest.fn(),
      openConfirmation: jest.fn(),
      cancelCreation: jest.fn(),
      confirmCreation: jest.fn(),
      // Mockeamos la signal
      confirmState: signal({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [PreliminaryDraftCreatePageComponent]
    })
    // Sobrescribimos el servicio provisto a nivel de componente
    .overrideComponent(PreliminaryDraftCreatePageComponent, {
      set: {
        providers: [{ provide: PreliminaryDraftCreatePageService, useValue: mockPageService }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(PreliminaryDraftCreatePageComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería verificar el acceso al inicializar (ngOnInit)', () => {
    fixture.detectChanges(); // Esto dispara ngOnInit

    expect(mockPageService.checkAccess).toHaveBeenCalled();
  });
});
