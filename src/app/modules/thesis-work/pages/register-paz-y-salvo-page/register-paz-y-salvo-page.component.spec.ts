// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

// 2. Componente a probar
import { RegisterPazYSalvoPageComponent } from './register-paz-y-salvo-page.component';

// 3. Servicios y Facades
import { RegisterPazYSalvoFacadeService } from './services/register-paz-y-salvo-facade.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { PazYSalvoPayload } from '../../interfaces/paz-y-salvo-playload.interface';
import { User } from '../../../users/interfaces/user.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';

// Importamos los componentes reales para removerlos en el override
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterPazYSalvoFormComponent } from '../../components/register-paz-y-salvo-form/register-paz-y-salvo-form.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

@Component({ selector: 'app-register-paz-y-salvo-form', template: '', standalone: true })
class MockRegisterPazYSalvoFormComponent {
  @Input({ required: true }) thesisWork!: ThesisWork;
  @Input() isSubmitting = false;
  @Output() onSave = new EventEmitter<{ payload: PazYSalvoPayload; file: File }>();
  @Output() onGoBack = new EventEmitter<void>();

  // FIX: Agregado el Output faltante para el evento de descarga
  @Output() onDownloadFile = new EventEmitter<FileDocument>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<void>();
}

// ── Tipos Seguros para los Mocks (Cero 'any', 'unknown') ─────────────────────

interface MockRouteNode {
  snapshot: { paramMap: { get: jest.Mock<string | null, [string]> } };
  parent: MockRouteNode | null;
}

interface MockRouter {
  navigate: jest.Mock<void, [string[], { relativeTo: MockRouteNode | null }]>;
}

interface MockRegisterPazYSalvoFacadeService {
  loadThesisWork: jest.Mock<void, [string, (work: ThesisWork) => void, () => void]>;
  processPazYSalvo: jest.Mock<void, [string, PazYSalvoPayload, File, () => void, () => void]>;

  // FIX: Añadida la firma para el mock del nuevo método
  downloadDocument: jest.Mock<Promise<void>, [FileDocument]>;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

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

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => {
  const base: Partial<FileDocument> = {
    id: 'doc-1',
    name: 'documento_prueba',
    url: 'http://test/doc.pdf',
    type: DocumentType.PAZ_Y_SALVO,
    uploadDate: new Date(),
    status: stateList.EN_REVISION,
    ...overrides
  };
  return base as FileDocument;
};

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => {
  const baseUser = createMockUser();
  const baseThesis: Partial<ThesisWork> = {
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
      evaluators: [],
      evaluations: [],
      documents: [],
      proposalData: {
        id: 'p-1',
        title: 'Mock Title',
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

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('RegisterPazYSalvoPageComponent', () => {
  let component: RegisterPazYSalvoPageComponent;
  let fixture: ComponentFixture<RegisterPazYSalvoPageComponent>;

  // Mocks tipados
  let facadeMock: MockRegisterPazYSalvoFacadeService;
  let routerMock: MockRouter;
  let routeMock: MockRouteNode;

  const mockWork = createMockThesisWork({ thesisWorkId: '123' });

  beforeEach(async () => {
    // 🔕 Silenciar consola como medida preventiva
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Arrange: Configuración de los parámetros de ruta jerárquicos
    routeMock = {
      snapshot: { paramMap: { get: jest.fn().mockReturnValue(null) } },
      parent: {
        snapshot: { paramMap: { get: jest.fn().mockImplementation((param) => param === 'id' ? '123' : null) } },
        parent: null
      }
    };

    routerMock = {
      navigate: jest.fn()
    };

    facadeMock = {
      loadThesisWork: jest.fn(),
      processPazYSalvo: jest.fn(),
      downloadDocument: jest.fn().mockResolvedValue(undefined)
    };

    await TestBed.configureTestingModule({
      imports: [RegisterPazYSalvoPageComponent],
      providers: [
        { provide: RegisterPazYSalvoFacadeService, useValue: facadeMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    })
    .overrideComponent(RegisterPazYSalvoPageComponent, {
      remove: { imports: [ConfirmationActionModalComponent, RegisterPazYSalvoFormComponent] },
      add: { imports: [MockConfirmationActionModalComponent, MockRegisterPazYSalvoFormComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(RegisterPazYSalvoPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Limpia el estado de los mocks entre cada prueba para evitar falsos positivos
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Rutas (ngOnInit)', () => {
    it('debería extraer el ID de la ruta padre y cargar la tesis', () => {
      fixture.detectChanges();

      expect(facadeMock.loadThesisWork).toHaveBeenCalledWith(
        '123',
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('debería regresar si no encuentra un ID en toda la jerarquía de rutas', () => {
      // Forzamos a que el padre también devuelva null
      routeMock.parent!.snapshot.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
      expect(facadeMock.loadThesisWork).not.toHaveBeenCalled();
    });

    it('los callbacks de loadThesisWork deberían modificar el estado correctamente en caso de éxito', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess) => onSuccess(mockWork));

      fixture.detectChanges();

      expect(component.thesisWorkState()).toEqual(mockWork);
    });

    it('los callbacks de loadThesisWork deberían retroceder en caso de error', () => {
      facadeMock.loadThesisWork.mockImplementation((id, onSuccess, onError) => onError());

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });
  });

  describe('Acciones del usuario', () => {
    it('handleRequestConfirmation debería guardar la data pendiente y abrir el modal', () => {
      const mockData = {
        payload: { academicApproved: true, academicComments: '', financialApproved: true, financialComments: '' },
        file: new File([''], 'test.pdf')
      };

      component.handleRequestConfirmation(mockData);

      expect(component.pendingData()).toEqual(mockData);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('goBack debería navegar a loaded_documents relativo al padre', () => {
      component.goBack();

      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('downloadDocument debería invocar asíncronamente la descarga en el facade enviando el documento', () => {
      const mockDoc = createMockFileDocument();

      component.downloadDocument(mockDoc);

      expect(facadeMock.downloadDocument).toHaveBeenCalledWith(mockDoc);
    });
  });

  describe('Guardado de Evaluación (processPazYSalvo)', () => {
    const mockData = {
      payload: { academicApproved: true, academicComments: '', financialApproved: true, financialComments: '' },
      file: new File([''], 'test.pdf')
    };

    beforeEach(() => {
      // Arrange estado base para pruebas de submit
      component.thesisWorkState.set(mockWork);
      component.pendingData.set(mockData);
    });

    it('debería abortar si no hay data pendiente o ID de tesis', () => {
      component.pendingData.set(null);

      component.processPazYSalvo();

      expect(facadeMock.processPazYSalvo).not.toHaveBeenCalled();
    });

    it('debería llamar al facade e indicar isSubmitting', () => {
      component.isConfirmModalOpen.set(true);

      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(true);
      expect(component.isConfirmModalOpen()).toBe(false);
      expect(facadeMock.processPazYSalvo).toHaveBeenCalledWith(
        '123',
        mockData.payload,
        mockData.file,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('callback onSuccess debería detener isSubmitting y navegar atrás', () => {
      facadeMock.processPazYSalvo.mockImplementation((id, p, f, onSuccess) => onSuccess());

      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).toHaveBeenCalledWith(['loaded_documents'], { relativeTo: routeMock.parent });
    });

    it('callback onError debería detener isSubmitting y NO navegar', () => {
      facadeMock.processPazYSalvo.mockImplementation((id, p, f, onSuccess, onError) => onError());

      component.processPazYSalvo();

      expect(component.isSubmitting()).toBe(false);
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });
  });
});
