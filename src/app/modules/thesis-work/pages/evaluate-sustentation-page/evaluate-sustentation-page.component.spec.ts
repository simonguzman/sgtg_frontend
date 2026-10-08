import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EvaluateSustentationPageComponent } from './evaluate-sustentation-page.component';
import { EvaluateSustentationFacadeService } from './services/evaluate-sustentation-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationEvaluationPayload } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { EvaluateSustentationFormComponent } from '../../components/evaluate-sustentation-form/evaluate-sustentation-form.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

@Component({ selector: 'app-evaluate-sustentation-form', template: '', standalone: true })
class MockEvaluateSustentationFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: SustentationEvaluationPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>();
}

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockEvaluateSustentationFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processEvaluation: jest.Mock<void, [string, SustentationEvaluationPayload, File, () => void, () => void]>;
  downloadDocument: jest.Mock<Promise<void>, [FileDocument]>;
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

const createMockEvaluationPayload = (overrides: Partial<SustentationEvaluationPayload> = {}): SustentationEvaluationPayload => ({
  veredict: stateList.APROBADO,
  observations: 'Sin observaciones',
  evaluationDate: new Date('2026-08-24T10:00:00'),
  ...overrides
});

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento.pdf',
  url: 'http://docs/documento.pdf',
  uploadDate: new Date(),
  type: DocumentType.FORMATO,
  ...overrides
});

describe('EvaluateSustentationPageComponent', () => {
  let component: EvaluateSustentationPageComponent;
  let fixture: ComponentFixture<EvaluateSustentationPageComponent>;

  let facadeMock: MockEvaluateSustentationFacadeService;
  let routerMock: MockRouter;
  let activatedRouteMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      processEvaluation: jest.fn(),
      downloadDocument: jest.fn()
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
      imports: [EvaluateSustentationPageComponent],
      providers: [
        { provide: EvaluateSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    })
    .overrideComponent(EvaluateSustentationPageComponent, {
      remove: {
        imports: [ConfirmationActionModalComponent, EvaluateSustentationFormComponent]
      },
      add: {
        imports: [MockConfirmationActionModalComponent, MockEvaluateSustentationFormComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(EvaluateSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización y Navegación', () => {
    it('debería buscar el ID en la ruta anidada y cargar la tesis a través del facade', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
      expect(component.thesisWorkState()).toEqual(mockWork);
    });

    it('debería ejecutar goBack si no encuentra el ID en la ruta ni en sus padres', () => {
      activatedRouteMock.parent!.snapshot.paramMap.get.mockReturnValue(null);
      const goBackSpy = jest.spyOn(component, 'goBack');

      fixture.detectChanges();

      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar a "loaded_documents" relativo al padre al invocar goBack', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(
        ['loaded_documents'],
        { relativeTo: activatedRouteMock.parent }
      );
    });
  });

  describe('Flujo de Guardado y Delegación', () => {
    const mockData = {
      payload: createMockEvaluationPayload(),
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      component.thesisWorkState.set(mockWork);
    });

    it('debería almacenar datos temporales y abrir el modal al disparar handleSaveTriggered', () => {
      component.handleSaveTriggered(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('debería detener el guardado (return temprano) si no hay datos pendientes o falta el ID', () => {
      component.pendingData.set(null);

      component.processSustentationEvaluation();

      expect(facadeMock.processEvaluation).not.toHaveBeenCalled();
      expect(component.isSubmitting()).toBe(false);
    });

    it('debería procesar la evaluación, resetear indicadores y ejecutar onSuccess', () => {
      component.pendingData.set(mockData);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess) => onSuccess());

      component.processSustentationEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processEvaluation).toHaveBeenCalledWith(
        '123',
        mockData.payload,
        mockData.file,
        expect.any(Function),
        expect.any(Function)
      );
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('debería mantener al usuario en la pantalla si el guardado falla (ejecuta onError)', () => {
      component.pendingData.set(mockData);
      component.isConfirmModalOpen.set(true);
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processEvaluation.mockImplementation((id, payload, file, onSuccess, onError) => onError());

      component.processSustentationEvaluation();

      expect(component.isSubmitting()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(goBackSpy).not.toHaveBeenCalled();
    });
  });

  describe('Delegación de Descargas', () => {
    it('debería invocar la función de descarga del facade de manera correcta', () => {
      const mockDoc = createMockFileDocument();
      facadeMock.downloadDocument.mockResolvedValue();

      component.downloadDocument(mockDoc);

      expect(facadeMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });
});
