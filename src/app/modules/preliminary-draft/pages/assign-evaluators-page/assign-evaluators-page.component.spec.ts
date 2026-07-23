import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AssignEvaluatorsPageComponent } from './assign-evaluators-page.component';
import { AssignEvaluatorsPageFacadeService } from './services/assign-evaluators-page-facade.service';
import { signal } from '@angular/core';

describe('AssignEvaluatorsPageComponent', () => {
  let component: AssignEvaluatorsPageComponent;
  let fixture: ComponentFixture<AssignEvaluatorsPageComponent>;
  let mockFacade: jest.Mocked<Partial<AssignEvaluatorsPageFacadeService>>;

  beforeEach(async () => {
    mockFacade = {
      init: jest.fn(),
      goBack: jest.fn(),
      handleAssign: jest.fn(),
      cancelAssignment: jest.fn(),
      confirmAssignment: jest.fn(),
      selectedPreliminaryDraft: signal(null),
      isDataLoading: signal(true),
      confirmState: signal({
        isOpen: false,
        pendingData: null,
        isProcessing: false
      })
    };

    await TestBed.configureTestingModule({
      imports: [AssignEvaluatorsPageComponent]
    })
    .overrideComponent(AssignEvaluatorsPageComponent, {
      set: {
        providers: [{ provide: AssignEvaluatorsPageFacadeService, useValue: mockFacade }]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignEvaluatorsPageComponent);
    component = fixture.componentInstance;
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debería inicializar el facade al cargar el componente (ngOnInit)', () => {
    fixture.detectChanges(); // Ejecuta ngOnInit

    expect(mockFacade.init).toHaveBeenCalled();
  });
});
