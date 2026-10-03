import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterCorrectedDocumentsPageComponent } from './register-corrected-documents-page.component';
import { RegisterCorrectedDocumentsFacadeService } from './services/register-corrected-documents-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterCorrectedDocumentFormComponent } from '../../components/register-corrected-document-form/register-corrected-document-form.component';

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-register-corrected-document-form', template: '', standalone: true })
class MockRegisterCorrectedDocumentFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSaveDocuments = new EventEmitter<{ monograph: File; annexes: File }>();
  @Output() onGoBack = new EventEmitter<void>();
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode }]>;
}

interface MockRegisterCorrectedDocumentsFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processCorrectedDocuments: jest.Mock<void, [string, { monograph: File; annexes: File }, () => void, () => void]>;
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

describe('RegisterCorrectedDocumentsPageComponent', () => {
  let component: RegisterCorrectedDocumentsPageComponent;
  let fixture: ComponentFixture<RegisterCorrectedDocumentsPageComponent>;

  let facadeMock: MockRegisterCorrectedDocumentsFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      processCorrectedDocuments: jest.fn(),
      showNavigationError: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    activatedRouteMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterCorrectedDocumentsPageComponent],
      providers: [
        { provide: RegisterCorrectedDocumentsFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(RegisterCorrectedDocumentsPageComponent, {
      remove: {
        imports: [
          RegisterCorrectedDocumentFormComponent,
          ConfirmationActionModalComponent
        ]
      },
      add: {
        imports: [MockRegisterCorrectedDocumentFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterCorrectedDocumentsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('ngOnInit y Navegación', () => {
    it('debería buscar el ID recursivamente y cargar la información de la tesis', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkState()).toEqual(mockWork);
    });

    it('debería mostrar error de navegación y retroceder si no encuentra ID', () => {
      activatedRouteMock.parent = null;
      const goBackSpy = jest.spyOn(component, 'goBack');

      fixture.detectChanges();

      expect(facadeMock.showNavigationError).toHaveBeenCalled();
      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar hacia atrás correctamente en goBack', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['../'], { relativeTo: activatedRouteMock });
    });
  });

  describe('Flujo de envío de documentos', () => {
    const mockFiles = { monograph: new File([''], 'mono.pdf'), annexes: new File([''], 'anexos.zip') };

    beforeEach(() => {
      component.thesisWorkState.set(mockWork);
    });

    it('debería guardar los archivos temporalmente y abrir el modal', () => {
      component.handleRequestConfirmation(mockFiles);

      expect(component.pendingFilesData()).toEqual(mockFiles);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería no hacer nada si faltan archivos o ID del proyecto', () => {
      component.pendingFilesData.set(null);

      component.processCorrectedDocuments();

      expect(facadeMock.processCorrectedDocuments).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('debería procesar documentos exitosamente, cerrar modal y retroceder', () => {
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess) => onSuccess());

      component.processCorrectedDocuments();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processCorrectedDocuments).toHaveBeenCalledWith(
        '123',
        mockFiles,
        expect.any(Function),
        expect.any(Function)
      );
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería manejar el error de guardado bajando la bandera de envío sin retroceder', () => {
      component.pendingFilesData.set(mockFiles);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processCorrectedDocuments.mockImplementation((id, files, onSuccess, onError) => onError());

      component.processCorrectedDocuments();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });
});
