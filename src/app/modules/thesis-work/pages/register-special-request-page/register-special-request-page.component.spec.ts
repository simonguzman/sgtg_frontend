import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterSpecialRequestPageComponent, SpecialRequestData } from './register-special-request-page.component';
import { RegisterSpecialRequestFacadeService } from './services/register-special-request-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../enums/special-request-type.enum';
import { stateList } from '../../../../core/enums/state.enum';
import { User } from '../../../users/interfaces/user.interface';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { RegisterSpecialRequestFormComponent } from '../../components/register-special-request-form/register-special-request-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<Promise<boolean>, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void, () => void]>;
  processSaveRequest: jest.Mock<void, [string, SpecialRequestData, () => void, () => void]>;
}

@Component({ selector: 'app-register-special-request-form', standalone: true, template: '' })
class MockRegisterSpecialRequestFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveRequest = new EventEmitter<SpecialRequestData>();
}

@Component({ selector: 'app-confirmation-action-modal', standalone: true, template: '' })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'u-1',
  idType: IdentificationType.CC,
  idNumber: 123456789,
  firstName: 'Juan',
  secondName: '',
  lastName: 'Perez',
  secondLastName: '',
  codeNumber: 1234567890,
  email: 'juan@test.com',
  password: 'hash',
  state: UserState.active,
  roles: [],
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
    thesisWorkId: 'thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'prop-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'prop-1',
        title: 'Título Mock',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      } as NonNullable<ThesisWork['preliminaryDraftData']>['proposalData']
    } as NonNullable<ThesisWork['preliminaryDraftData']>
  };
  return { ...baseThesis, ...overrides } as ThesisWork;
};

describe('RegisterSpecialRequestPageComponent', () => {
  let component: RegisterSpecialRequestPageComponent;
  let fixture: ComponentFixture<RegisterSpecialRequestPageComponent>;

  let facadeMock: MockFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  const mockThesisWork = createMockThesisWork();

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      processSaveRequest: jest.fn()
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    };

    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSpecialRequestPageComponent],
      providers: [
        { provide: RegisterSpecialRequestFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterSpecialRequestPageComponent, {
      remove: {
        imports: [RegisterSpecialRequestFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockRegisterSpecialRequestFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSpecialRequestPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('ngOnInit - Inicialización y Enrutamiento', () => {
    it('debería regresar (goBack) inmediatamente si no encuentra el ID de la tesis en la ruta', () => {
      routeMock.snapshot.paramMap.get.mockReturnValue(null);
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería cargar el trabajo de grado si hay ID en la ruta', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkData()).toEqual(mockThesisWork);
      expect(component.isLoading()).toBe(false);
    });

    it('debería regresar si el trabajo no es encontrado (callback onNotFound)', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onNotFound) => onNotFound());

      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('debería quitar el estado de carga si ocurre un error en la petición (callback onError)', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onNotFound, onError) => onError());

      fixture.detectChanges();

      expect(component.isLoading()).toBe(false);
      expect(component.thesisWorkData()).toBeUndefined();
    });
  });

  describe('Flujo de Confirmación y Guardado', () => {
    let payload: SpecialRequestData;

    beforeEach(() => {
      payload = { requestType: Object.values(SpecialRequestType)[0], comments: 'Prueba' };

      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));
      fixture.detectChanges();
    });

    it('handleRequestConfirmation debería abrir el modal y guardar los datos pendientes', () => {
      component.handleRequestConfirmation(payload);

      expect(component.pendingData()).toEqual(payload);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('processSaveRequest no debería hacer nada si no hay data pendiente', () => {
      component.pendingData.set(null);

      component.processSaveRequest();

      expect(facadeMock.processSaveRequest).not.toHaveBeenCalled();
    });

    it('processSaveRequest debería cerrar el modal y llamar al facade para guardar con éxito', () => {
      component.pendingData.set(payload);
      facadeMock.processSaveRequest.mockImplementation((id, data, onSuccess) => onSuccess());

      component.processSaveRequest();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSaveRequest).toHaveBeenCalledWith(
        'thesis-123',
        payload,
        expect.any(Function),
        expect.any(Function)
      );
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('processSaveRequest debería quitar estado isSubmitting pero no navegar si falla el guardado', () => {
      component.pendingData.set(payload);
      facadeMock.processSaveRequest.mockImplementation((id, data, onSuccess, onError) => onError());

      component.processSaveRequest();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
