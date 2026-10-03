import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UploadFinalDeliveryPageComponent } from './upload-final-delivery-page.component';
import { UploadFinalDeliveryFacadeService } from './services/upload-final-delivery-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { UploadFinalDeliveryFormComponent } from '../../components/upload-final-delivery-form/upload-final-delivery-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';

@Component({ selector: 'app-upload-final-delivery-form', template: '', standalone: true })
class MockUploadFinalDeliveryFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDelivery = new EventEmitter<{ monograph: File; formatE: File; annexes?: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockUploadFinalDeliveryFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processFinalDelivery: jest.Mock<void, [string, { monograph: File; formatE: File; annexes?: File }, () => void, () => void]>;
  showNavigationError: jest.Mock<void, []>;
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
  const baseThesis: ThesisWork = {
    thesisWorkId: 'mock-thesis-123',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    preliminaryDraftData: {
      preliminaryDraftId: 'draft-1',
      proposalId: 'p-1',
      state: stateList.APROBADO,
      createdData: new Date(),
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Título Mock',
        description: 'Desc',
        modality: Modality.TI,
        authors: [baseUser],
        director: baseUser,
        state: stateList.APROBADO,
        createdAt: new Date(),
        documents: [],
        evaluations: []
      }
    }
  };
  return { ...baseThesis, ...overrides };
};

describe('UploadFinalDeliveryPageComponent', () => {
  let component: UploadFinalDeliveryPageComponent;
  let fixture: ComponentFixture<UploadFinalDeliveryPageComponent>;

  let facadeMock: MockUploadFinalDeliveryFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockThesisWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      processFinalDelivery: jest.fn(),
      showNavigationError: jest.fn(),
    };

    routerMock = {
      navigate: jest.fn(),
    };

    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
        parent: null,
      },
    };

    await TestBed.configureTestingModule({
      imports: [UploadFinalDeliveryPageComponent],
      providers: [
        { provide: UploadFinalDeliveryFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
      ]
    })
    .overrideComponent(UploadFinalDeliveryPageComponent, {
      remove: { imports: [UploadFinalDeliveryFormComponent, ConfirmationActionModalComponent] },
      add: { imports: [MockUploadFinalDeliveryFormComponent, MockConfirmationActionModalComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadFinalDeliveryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  describe('Inicialización y Rutas (ngOnInit)', () => {
    it('debería cargar el trabajo de grado si el ID está presente', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockThesisWork));

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith('123', expect.any(Function), expect.any(Function));
      expect(component.thesisWorkState()).toEqual(mockThesisWork);
    });

    it('debería mostrar error de navegación y volver atrás si no hay ID en ninguna ruta', () => {
      activatedRouteMock.snapshot.paramMap.get.mockReturnValue(null);
      if (activatedRouteMock.parent) {
        activatedRouteMock.parent.snapshot.paramMap.get.mockReturnValue(null);
      }

      fixture.detectChanges();

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });
  });

  describe('Interacciones (handleRequestConfirmation / goBack)', () => {
    it('handleRequestConfirmation debería guardar los archivos en pendiente y abrir el modal', () => {
      const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

      component.handleRequestConfirmation(mockFiles);

      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar hacia loaded_documents con la ruta relativa correcta', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });
  });

  describe('Envío y Procesamiento (processFinalDelivery)', () => {
    const mockFiles = { monograph: new File([''], 'm.pdf'), formatE: new File([''], 'e.pdf') };

    beforeEach(() => {
      component.thesisWorkState.set(mockThesisWork);
      component.pendingFilesData.set(mockFiles);
    });

    it('debería abortar silenciosamente si no hay archivos pendientes', () => {
      component.pendingFilesData.set(null);

      component.processFinalDelivery();

      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });

    it('debería abortar silenciosamente si no existe una tesis cargada (id null)', () => {
      component.thesisWorkState.set(null);

      component.processFinalDelivery();

      expect(facadeMock.processFinalDelivery).not.toHaveBeenCalled();
    });

    it('debería procesar la entrega, cerrar modales y navegar atrás al tener éxito', () => {
      facadeMock.processFinalDelivery.mockImplementation((id, files, onSuccess) => onSuccess());

      component.processFinalDelivery();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], {
        relativeTo: activatedRouteMock.parent
      });
    });

    it('debería procesar la entrega y mantener al usuario en pantalla si hay un error', () => {
      facadeMock.processFinalDelivery.mockImplementation((id, files, onSuccess, onError) => onError());

      component.processFinalDelivery();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
