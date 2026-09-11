// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, ParamMap } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Component, Input, Output, EventEmitter, signal, WritableSignal } from '@angular/core';

// 2. Componente a probar
import { LoadedDocumentsThesisWorkPageComponent } from './loaded-documents-thesis-work-page.component';

// 3. Servicios y Facades
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { LoadedDocumentsThesisWorkFacadeService } from './services/loaded-documents-thesis-work-facade.service';
import { ThesisWorkDetailsModalResolverService } from './services/thesis-work-details-modal-resolver.service';

// 4. Interfaces y Enums
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { Advance } from '../../interfaces/advance.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { TabConfiguration } from './tabs-logic/tab-config.interface';
import { stateList } from '../../../../core/enums/state.enum';
import { IdentificationType } from '../../../users/enum/identification-type.enum';
import { UserState } from '../../../users/enum/user-state.enum';
import { Modality } from '../../../proposal/enums/modality.enum';

// Importaciones de los componentes reales para removerlos en el override
import { FileUploadModalComponent } from '../../../../shared/components/modals/file-upload-modal/file-upload-modal.component';
import { ConfirmationActionModalComponent } from '../../../../shared/components/modals/confirmation-action-modal/confirmation-action-modal.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { TableComponent, TableButton } from '../../../../shared/components/table-component/table-component.component';
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';

// ── Mocks de Componentes Hijos (Standalone y Strict-Init) ────────────────────

@Component({ selector: 'app-table-component', template: '', standalone: true })
class MockTableComponent {
  @Input() value: unknown[] = [];
  @Input() columns: unknown[] = [];
  @Input() paginator = true;
  @Input() headerButtons: TableButton[] = [];
  @Input() emptyMessage = '';
  @Output() headerButtonClick = new EventEmitter<TableButton>();
  @Output() actionClick = new EventEmitter<{ action: string; row: Record<string, unknown> }>();
}

@Component({ selector: 'app-tabs', template: '', standalone: true })
class MockTabsComponent {
  @Input() tabs: unknown[] = [];
  @Input() activeTab = '';
  @Output() tabChange = new EventEmitter<string>();
}

@Component({ selector: 'app-file-upload-modal', template: '', standalone: true })
class MockFileUploadModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Input() uploadedBy = '';
  @Output() onFileUploaded = new EventEmitter<{ fileName: string; file: File }>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-confirmation-action-modal', template: '', standalone: true })
class MockConfirmationActionModalComponent {
  @Input() isOpen = false;
  @Input() description = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() onClose = new EventEmitter<void>();
}

@Component({ selector: 'app-register-information-modal', template: '', standalone: true })
class MockRegisterInformationModalComponent {
  @Input() isOpen = false;
  @Input() modalHeader = '';
  @Input() subTitle = '';
  @Input() title = '';
  @Input() comments = '';
  @Input() modality = '';
  @Input() student = '';
  @Input() director = '';
  @Input() codirector: string | undefined = undefined;
  @Input() adviser: string | undefined = undefined;
  @Input() chargeDate = '';
  @Input() state = '';
  @Input() documents: string[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<string>();
}

// ── Tipos Estructurales Seguros para Mocks Recursivos y Espías ──────────────

type DeepPartialActivatedRoute = {
  snapshot: { paramMap: ParamMap };
  firstChild?: DeepPartialActivatedRoute | null;
  parent?: DeepPartialActivatedRoute | null;
};

interface MockLoadedDocumentsFacade {
  uploadDocument: jest.Mock;
  downloadDocument: jest.Mock;
  downloadDocumentByName: jest.Mock;
  showRestrictedActionNotification: jest.Mock;
  showNotFoundError: jest.Mock;
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockUser = (overrides: Partial<User> = {}): User => ({
  id: 'user-1',
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
    thesisWorkId: 'thesis-1',
    preliminaryDraftId: 'draft-1',
    documents: [],
    evaluations: [],
    specialRequests: [],
    correctedDeliveries: [],
    sustentations: [],
    advances: [],
    finalDeliveries: [],
    pazYSalvos: [],
    state: stateList.EN_DESARROLLO,
    createdDate: new Date(),
    isArchived: false,
    // FIX: Reemplazamos el "any" por el casteo estricto anidado
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

const createMockAdvance = (overrides: Partial<Advance> = {}): Advance => ({
  id: 'adv-1',
  title: 'Avance Base',
  comments: 'Comentarios base',
  uploadDate: new Date(),
  studentId: 'student-1',
  status: stateList.EN_REVISION,
  documents: [],
  ...overrides
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('LoadedDocumentsThesisWorkPageComponent', () => {
  let component: LoadedDocumentsThesisWorkPageComponent;
  let fixture: ComponentFixture<LoadedDocumentsThesisWorkPageComponent>;

  let routerSpy: Pick<Router, 'navigate'>;
  let facadeSpy: MockLoadedDocumentsFacade;
  let resolverSpy: { resolve: jest.Mock };

  let authSpy: Partial<AuthService>;
  let breadcrumbSpy: Partial<BreadcrumbService>;
  let participantsSpy: Partial<ThesisParticipantsFormatterService>;
  let titleSpy: Partial<Title>;

  let thesisWorksSignal: WritableSignal<ThesisWork[]>;
  let currentUserSignal: WritableSignal<User | null>;
  let routeMock: DeepPartialActivatedRoute;

  let originalAdvancesStrategy: TabConfiguration<unknown>;

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});

    routerSpy = { navigate: jest.fn() };

    facadeSpy = {
      // Simulamos la ejecución síncrona del callback de éxito
      uploadDocument: jest.fn((id, file, type, onSuccess, _onError) => onSuccess()),
      downloadDocument: jest.fn().mockResolvedValue(undefined),
      downloadDocumentByName: jest.fn().mockResolvedValue(undefined),
      showRestrictedActionNotification: jest.fn(),
      showNotFoundError: jest.fn()
    };

    resolverSpy = { resolve: jest.fn() };

    currentUserSignal = signal<User | null>(createMockUser({ id: 'user-123' }));
    authSpy = {
      currentUser: currentUserSignal,
      hasAnyRole: jest.fn().mockReturnValue(false)
    };

    breadcrumbSpy = {
      setDynamicBreadcrumb: jest.fn(),
      clearDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn()
    };

    titleSpy = { setTitle: jest.fn() };

    participantsSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante Mock'),
      getDirectorName: jest.fn().mockReturnValue('Director Mock'),
      getCodirectorName: jest.fn().mockReturnValue(undefined),
      getAdvisorName: jest.fn().mockReturnValue(undefined)
    };

    // Estructura limpia y tipada que simula el árbol de ActivatedRoute
    routeMock = {
      snapshot: { paramMap: convertToParamMap({}) },
      firstChild: {
        snapshot: { paramMap: convertToParamMap({ id: 'id-from-child' }) },
        firstChild: null
      },
      parent: {
        snapshot: { paramMap: convertToParamMap({ id: 'id-from-parent' }) }
      }
    };

    thesisWorksSignal = signal<ThesisWork[]>([createMockThesisWork({ thesisWorkId: 'id-from-child' })]);

    await TestBed.configureTestingModule({
      imports: [LoadedDocumentsThesisWorkPageComponent],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: LoadedDocumentsThesisWorkFacadeService, useValue: facadeSpy },
        { provide: ThesisWorkDetailsModalResolverService, useValue: resolverSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: BreadcrumbService, useValue: breadcrumbSpy },
        { provide: Title, useValue: titleSpy },
        { provide: ThesisWorkService, useValue: { allThesisWorks: thesisWorksSignal } },
        { provide: ThesisParticipantsFormatterService, useValue: participantsSpy }
      ]
    })
    .overrideComponent(LoadedDocumentsThesisWorkPageComponent, {
      remove: {
        imports: [
          FileUploadModalComponent,
          ConfirmationActionModalComponent,
          TableComponent,
          TabsComponent,
          RegisterInformationModalComponent
        ]
      },
      add: {
        imports: [
          MockFileUploadModalComponent,
          MockConfirmationActionModalComponent,
          MockTableComponent,
          MockTabsComponent,
          MockRegisterInformationModalComponent
        ]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsThesisWorkPageComponent);
    component = fixture.componentInstance;

    // Almacenamos la estrategia original para restaurarla
    // FIX: Tipado estricto `unknown` en vez de `any`
    originalAdvancesStrategy = component['tabStrategies']['AVANCES'] as TabConfiguration<unknown>;

    fixture.detectChanges();
  });

  afterEach(() => {
    // Restablecemos la estrategia original
    component['tabStrategies']['AVANCES'] = originalAdvancesStrategy;

    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('Inicialización y Ciclo de Vida', () => {
    it('debe capturar el ID desde el child más profundo de la ruta en ngOnInit', () => {
      expect(component.thesisWorkId()).toBe('id-from-child');
    });

    it('debe actualizar breadcrumb y title a través del effect al cambiar la pestaña', (done) => {
      (breadcrumbSpy.setDynamicBreadcrumb as jest.Mock).mockClear();
      (titleSpy.setTitle as jest.Mock).mockClear();

      component.activeTab.set('CORRESPONDENCIA');
      fixture.detectChanges();

      setTimeout(() => {
        expect(breadcrumbSpy.setDynamicBreadcrumb).toHaveBeenCalledWith('Correspondencia');
        expect(titleSpy.setTitle).toHaveBeenCalledWith('Trabajo de Grado - Correspondencia');
        done();
      }, 10);
    });

    it('debe usar un valor por defecto para breadcrumb y title si la pestaña no se encuentra en la configuración', (done) => {
      (breadcrumbSpy.setDynamicBreadcrumb as jest.Mock).mockClear();
      (titleSpy.setTitle as jest.Mock).mockClear();

      component.activeTab.set('PESTANA_INEXISTENTE');
      fixture.detectChanges();

      setTimeout(() => {
        expect(breadcrumbSpy.setDynamicBreadcrumb).toHaveBeenCalledWith('Documentos');
        expect(titleSpy.setTitle).toHaveBeenCalledWith('Trabajo de Grado - Documentos');
        done();
      }, 10);
    });

    it('ngOnDestroy debe limpiar el breadcrumb dinámico y el título', () => {
      component.ngOnDestroy();
      expect(breadcrumbSpy.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(breadcrumbSpy.setDynamicTitle).toHaveBeenCalledWith(null);
    });
  });

  describe('Computed Properties y Fallbacks', () => {
    it('currentThesisWork debe retornar null si no hay thesisWorkId asignado', () => {
      component.thesisWorkId.set(null);
      expect(component['currentThesisWork']()).toBeNull();
    });

    it('currentTableData debe retornar array vacío si no hay tesis encontrada en el contexto', () => {
      component.thesisWorkId.set('id-inexistente');
      expect(component.currentTableData()).toEqual([]);
    });

    it('los computed fields de participantes deben delegar al ThesisParticipantsFormatterService', () => {
      component.studentName();
      component.directorName();
      component.codirectorName();
      component.advisorName();

      const expectedThesis = component['currentThesisWork']();

      expect(participantsSpy.getStudentNames).toHaveBeenCalledWith(expectedThesis);
      expect(participantsSpy.getDirectorName).toHaveBeenCalledWith(expectedThesis);
      expect(participantsSpy.getCodirectorName).toHaveBeenCalledWith(expectedThesis);
      expect(participantsSpy.getAdvisorName).toHaveBeenCalledWith(expectedThesis);
    });
  });

  describe('Acciones de Header (handleHeaderButton)', () => {
    it('debe abrir el modal de subida si la estrategia actual no tiene un headerActionRoute configurado', (done) => {
      component['tabStrategies']['AVANCES'] = {
        ...originalAdvancesStrategy,
        headerActionRoute: undefined
      } as TabConfiguration<unknown>;

      // Forzar la reevaluación
      component.activeTab.set('OTRA_PESTAÑA');
      fixture.detectChanges();
      component.activeTab.set('AVANCES');
      fixture.detectChanges();

      setTimeout(() => {
        const button: TableButton = { label: 'Subir', action: 'upload', variant: 'primary' };
        component.handleHeaderButton(button);

        expect(component.isUploadModalOpen()).toBe(true);
        expect(routerSpy.navigate).not.toHaveBeenCalled();
        done();
      }, 10);
    });

    it('debe navegar si la estrategia actual tiene un headerActionRoute configurado', (done) => {
      component['tabStrategies']['AVANCES'] = {
        ...originalAdvancesStrategy,
        headerActionRoute: 'upload_advance'
      } as TabConfiguration<unknown>;

      component.activeTab.set('OTRA_PESTAÑA');
      fixture.detectChanges();
      component.activeTab.set('AVANCES');
      fixture.detectChanges();

      setTimeout(() => {
        const button: TableButton = { label: 'Ir', action: 'go', variant: 'primary' };
        component.handleHeaderButton(button);

        expect(routerSpy.navigate).toHaveBeenCalledWith(['upload_advance'], { relativeTo: routeMock.parent });
        done();
      }, 10);
    });
  });

  describe('Acciones de la tabla (handleTableAction)', () => {
    it('debe bloquear la acción y notificar si allowedActions existe y no incluye la acción solicitada', () => {
      component.handleTableAction({
        action: 'edit',
        row: { id: '1', allowedActions: ['view'] }
      });
      expect(facadeSpy.showRestrictedActionNotification).toHaveBeenCalled();
    });

    it('debe despachar descarga de documentos con fallback si las propiedades "url" o "name" están ausentes', () => {
      component.handleTableAction({
        action: 'download',
        row: { url: null, name: null }
      });
      expect(facadeSpy.downloadDocument).toHaveBeenCalledWith({ url: '', name: 'documento_sin_titulo' });
    });

    it('debe navegar a las rutas correspondientes según el switch interno de la acción', () => {
      const parent = routeMock.parent;

      component.handleTableAction({ action: 'evaluate-advance', row: { id: 'r1' } });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['evaluate_advance', 'r1'], { relativeTo: parent });

      component.handleTableAction({ action: 'evaluate_special_request', row: { id: 'r2' } });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['evaluate_special_request', 'r2'], { relativeTo: parent });

      component.handleTableAction({ action: 'view_sustentation_details', row: { id: 'r4' } });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['view_sustentation_details', 'r4'], { relativeTo: parent });

      component.handleTableAction({ action: 'evaluate_sustentation', row: { id: 'r5' } });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['evaluate_sustentation', 'r5'], { relativeTo: parent });

      component.handleTableAction({ action: 'unknown-route', row: { id: 'r3' } });
      expect(routerSpy.navigate).toHaveBeenCalledWith(['unknown-route'], { relativeTo: parent });
    });
  });

  describe('Modal de Detalles (openDetailsModal)', () => {
    it('debe abortar la resolución (early return) si la tesis no se encuentra en el contexto', () => {
      component.thesisWorkId.set('no-existe');
      component.handleTableAction({ action: 'view-details', row: { id: 'adv-1' } });

      expect(resolverSpy.resolve).not.toHaveBeenCalled();
    });

    it('debe mostrar error NotFound de la fachada si el resolver retorna null', () => {
      resolverSpy.resolve.mockReturnValue(null);
      component.handleTableAction({ action: 'view-details', row: { id: 'adv-1' } });

      expect(facadeSpy.showNotFoundError).toHaveBeenCalled();
      expect(component.isDetailsModalOpen()).toBe(false);
    });

    it('debe abrir el modal con el avance seleccionado y delegar las descargas al facade', () => {
      const mockAdvance = createMockAdvance({ id: 'adv-resolved' });
      resolverSpy.resolve.mockReturnValue(mockAdvance);

      component.handleTableAction({ action: 'view-details', row: { id: 'adv-1' } });

      expect(component.isDetailsModalOpen()).toBe(true);
      expect(component.selectedAdvance()?.id).toBe('adv-resolved');

      component.downloadDocumentByName('mi_archivo.pdf');

      // FIX: Alineado estrictamente con lo que recibe el componente en su firma real: (fileName, advance)
      expect(facadeSpy.downloadDocumentByName).toHaveBeenCalledWith(
        'mi_archivo.pdf',
        mockAdvance
      );
    });
  });

  describe('Manejo de archivos (Uploads)', () => {
    it('confirmUpload debe delegar al facade usando el tipo de documento configurado y luego cerrar el modal de confirmación', () => {
      const fileData = { fileName: 'doc.pdf', file: new File([], 'doc.pdf') };
      component.uploadContext.set(fileData);

      component['tabStrategies']['AVANCES'] = {
        ...originalAdvancesStrategy,
        modalConfig: {
          ...originalAdvancesStrategy.modalConfig,
          uploadDocumentType: DocumentType.AVANCE
        }
      } as TabConfiguration<unknown>;

      component.confirmUpload();

      expect(facadeSpy.uploadDocument).toHaveBeenCalledWith(
        'id-from-child',
        fileData,
        DocumentType.AVANCE,
        expect.any(Function), // onSuccess callback
        expect.any(Function)  // onError callback
      );
    });

    it('confirmUpload debe retornar tempranamente si falta el fileData, el thesisId o el docType', () => {
      component.uploadContext.set(null); // Provocar null intencionalmente
      component.confirmUpload();

      expect(facadeSpy.uploadDocument).not.toHaveBeenCalled();
    });

    it('onFileSelected debe establecer el contexto, cerrar el modal de carga y abrir el modal de confirmación', () => {
      component.onFileSelected({ fileName: 'test.pdf', file: new File([], 'test.pdf') });

      expect(component.uploadContext()?.fileName).toBe('test.pdf');
      expect(component.isUploadModalOpen()).toBe(false);
      expect(component.isConfirmModalOpen()).toBe(true);
    });

    it('cancelUpload debe cerrar el modal de confirmación y limpiar el contexto', () => {
      component.uploadContext.set({ fileName: 'doc.pdf', file: new File([], 'doc.pdf') });
      component.isConfirmModalOpen.set(true);

      component.cancelUpload();

      expect(component.isConfirmModalOpen()).toBe(false);
      expect(component.uploadContext()).toBeNull();
    });
  });

  describe('Navegación general', () => {
    it('goBack debe navegar a la ruta padre usando el router', () => {
      component.goBack();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['../'], { relativeTo: routeMock.parent });
    });
  });
});
