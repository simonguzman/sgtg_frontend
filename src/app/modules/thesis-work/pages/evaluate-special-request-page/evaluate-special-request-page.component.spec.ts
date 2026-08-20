import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { EvaluateSpecialRequestPageComponent } from './evaluate-special-request-page.component';
import { EvaluateSpecialRequestFacadeService } from './services/evaluate-special-request-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequest } from '../../interfaces/special-request.interface';
import { stateList } from '../../../../core/enums/state.enum';

import { EvaluateSpecialRequestFormComponent } from '../../components/evaluate-special-request-form/evaluate-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

type SpecialRequestVerdict = stateList.APROBADO | stateList.NO_APROBADO;

// -----------------------------------------------------------------------------
// MOCKS FUERTEMENTE TIPADOS
// -----------------------------------------------------------------------------
@Component({ selector: 'app-evaluate-special-request-form', standalone: true, template: '' })
class MockEvaluateSpecialRequestFormComponent {
  @Input() thesisWork!: ThesisWork;
  @Input() specialRequest!: SpecialRequest;
  @Input() isSubmitting: boolean = false;
  @Output() onSave = new EventEmitter<{ status: SpecialRequestVerdict; resolutionDetails: string; grantedDeadline?: Date }>();
  @Output() onBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen: boolean = false;
  @Input() description: string = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

describe('EvaluateSpecialRequestPageComponent', () => {
  let component: EvaluateSpecialRequestPageComponent;
  let fixture: ComponentFixture<EvaluateSpecialRequestPageComponent>;
  let facadeMock: jest.Mocked<EvaluateSpecialRequestFacadeService>;
  let routerMock: jest.Mocked<Router>;
  let activatedRouteMock: ActivatedRoute;

  const mockThesisWork = {
    thesisWorkId: 'thesis-123'
  } as Partial<ThesisWork> as ThesisWork;

  const mockSpecialRequest = {
    id: 'req-456'
  } as Partial<SpecialRequest> as SpecialRequest;

  beforeEach(async () => {
    facadeMock = {
      loadThesisWorkAndRequest: jest.fn(),
      processEvaluation: jest.fn()
    } as Partial<EvaluateSpecialRequestFacadeService> as jest.Mocked<EvaluateSpecialRequestFacadeService>;

    routerMock = {
      navigate: jest.fn()
    } as Partial<Router> as jest.Mocked<Router>;

    // Configuración robusta y sin 'any' para ActivatedRoute
    const mockParamMap = {
      get: jest.fn((param: string) => {
        if (param === 'requestId') return 'req-456';
        if (param === 'id') return 'thesis-123';
        return null;
      })
    };

    activatedRouteMock = {
      snapshot: {
        paramMap: mockParamMap
      },
      parent: {
        snapshot: {
          paramMap: mockParamMap
        },
        parent: null
      }
    } as unknown as ActivatedRoute;

    await TestBed.configureTestingModule({
      imports: [EvaluateSpecialRequestPageComponent],
      providers: [
        { provide: EvaluateSpecialRequestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(EvaluateSpecialRequestPageComponent, {
      remove: { imports: [EvaluateSpecialRequestFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockEvaluateSpecialRequestFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSpecialRequestPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ngOnInit - Inicialización de parámetros y carga', () => {
    it('debería cargar la data si se encuentran ambos parámetros en las rutas', () => {
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess) => onSuccess(mockThesisWork, mockSpecialRequest));

      fixture.detectChanges(); // Ejecuta ngOnInit

      expect(facadeMock.loadThesisWorkAndRequest).toHaveBeenCalledWith('thesis-123', 'req-456', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()).toEqual(mockThesisWork);
      expect(component.specialRequestState()).toEqual(mockSpecialRequest);
    });

    it('debería regresar y mostrar advertencia si falta algún parámetro', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      // CORRECCIÓN: En lugar de reasignar paramMap (que es read-only),
      // modificamos directamente el mock de la función 'get' para que retorne null
      (activatedRouteMock.snapshot.paramMap.get as jest.Mock).mockReturnValue(null);
      (activatedRouteMock.parent!.snapshot.paramMap.get as jest.Mock).mockReturnValue(null);

      fixture.detectChanges();

      expect(consoleSpy).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
      expect(facadeMock.loadThesisWorkAndRequest).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('debería regresar si falla la carga desde el facade', () => {
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess, onError) => onError());

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
    });
  });

  describe('Flujo de evaluación', () => {
    const payload = { status: stateList.APROBADO as SpecialRequestVerdict, resolutionDetails: 'Aprobado' };

    beforeEach(() => {
      facadeMock.loadThesisWorkAndRequest.mockImplementation((tId, rId, onSuccess) => onSuccess(mockThesisWork, mockSpecialRequest));
      fixture.detectChanges();
    });

    it('handleSaveTriggered debería establecer pendiente y abrir el modal', () => {
      component.handleSaveTriggered(payload);

      expect(component.pendingData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('processSpecialRequestEvaluation debería cancelar si falta data', () => {
      component.pendingData.set(null);

      component.processSpecialRequestEvaluation();

      expect(facadeMock.processEvaluation).not.toHaveBeenCalled();
    });

    it('processSpecialRequestEvaluation debería procesar la petición con éxito y navegar atrás', () => {
      component.pendingData.set(payload);
      facadeMock.processEvaluation.mockImplementation((tId, rId, data, onSuccess) => onSuccess());

      component.processSpecialRequestEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processEvaluation).toHaveBeenCalledWith('thesis-123', 'req-456', payload, expect.any(Function), expect.any(Function));
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], expect.anything());
    });

    it('processSpecialRequestEvaluation debería quitar el isSubmitting pero no navegar si falla', () => {
      component.pendingData.set(payload);
      facadeMock.processEvaluation.mockImplementation((tId, rId, data, onSuccess, onError) => onError());

      component.processSpecialRequestEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
