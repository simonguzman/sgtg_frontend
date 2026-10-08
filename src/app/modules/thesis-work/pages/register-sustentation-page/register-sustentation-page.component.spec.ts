import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RegisterSustentationPageComponent } from './register-sustentation-page.component';
import { RegisterSustentationFacadeService } from './services/register-sustentation-facade.service';
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { SustentationFormPayload } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { RegisterSustentationFormComponent } from '../../components/register-sustentation-form/register-sustentation-form.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';

@Component({ selector: 'app-register-sustentation-form', template: '', standalone: true })
class MockRegisterSustentationFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: SustentationFormPayload; file: File }>();
  @Output() onBack = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<FileDocument>(); // Agregado para soportar la descarga
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

interface MockRegisterSustentationFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processSustentation: jest.Mock<void, [string, SustentationFormPayload, File, () => void, () => void]>;
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

const createMockPayload = (overrides: Partial<SustentationFormPayload> = {}): SustentationFormPayload => ({
  sustentationDate: new Date('2026-10-10T10:00:00'),
  location: 'Auditorio',
  juror1: 'docente-1',
  juror2: 'docente-2',
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

describe('RegisterSustentationPageComponent', () => {
  let component: RegisterSustentationPageComponent;
  let fixture: ComponentFixture<RegisterSustentationPageComponent>;

  let facadeMock: MockRegisterSustentationFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: 'thesis-123' });

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    facadeMock = {
      loadThesisWork: jest.fn(),
      processSustentation: jest.fn(),
      downloadDocument: jest.fn()
    };

    routerMock = {
      navigate: jest.fn()
    };

    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockReturnValue('thesis-123') } },
        parent: null
      }
    };

    await TestBed.configureTestingModule({
      imports: [RegisterSustentationPageComponent],
      providers: [
        { provide: RegisterSustentationFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterSustentationPageComponent, {
      remove: {
        imports: [RegisterSustentationFormComponent, ConfirmationActionModalComponent]
      },
      add: {
        imports: [MockRegisterSustentationFormComponent, MockConfirmationActionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterSustentationPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('ngOnInit y Enrutamiento', () => {
    it('debería buscar el ID en la ruta actual o padres e invocar loadThesisWork', () => {
      fixture.detectChanges();

      expect(routeMock.parent!.snapshot.paramMap.get).toHaveBeenCalledWith('id');
      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        'thesis-123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería retornar atrás (goBack) si no encuentra ningún ID', () => {
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);
      const goBackSpy = jest.spyOn(component, 'goBack');

      fixture.detectChanges();

      expect(goBackSpy).toHaveBeenCalled();
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('debería navegar a loaded_documents al llamar a goBack', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Acciones de Usuario', () => {
    it('handleRequestConfirmation debería actualizar pendientes y abrir modal', () => {
      const mockData = { payload: createMockPayload(), file: new File([''], 'test.pdf') };

      component.handleRequestConfirmation(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });
  });

  describe('Proceso de Sustentación (processSustentacion)', () => {
    it('debería detenerse temprano si no hay datos pendientes o thesisId', () => {
      component.pendingData.set(null);

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
      expect(facadeMock.processSustentation).not.toHaveBeenCalled();
    });

    it('debería invocar al facade para procesar, activar isSubmitting y ocultar modal', () => {
      const mockPayload = createMockPayload();
      const mockFile = new File([''], 'f.pdf');

      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: mockPayload, file: mockFile });
      component.isConfirmModalOpen.set(true);

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processSustentation).toHaveBeenCalledWith(
        'thesis-123',
        mockPayload,
        mockFile,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('callbacks del facade deberían reiniciar isSubmitting y navegar atrás en caso de éxito', () => {
      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: createMockPayload(), file: new File([''], '') });
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processSustentation.mockImplementation((id, p, f, onSuccess, onError) => {
        onSuccess();
      });

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
      expect(goBackSpy).toHaveBeenCalled();
    });

    it('callbacks del facade deberían reiniciar isSubmitting y no navegar atrás en caso de error', () => {
      component.thesisWorkState.set(mockWork);
      component.pendingData.set({ payload: createMockPayload(), file: new File([''], '') });
      const goBackSpy = jest.spyOn(component, 'goBack');

      facadeMock.processSustentation.mockImplementation((id, p, f, onSuccess, onError) => {
        onError();
      });

      component.processSustentacion();

      expect(component.isSubmitting()).toBe(false);
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
