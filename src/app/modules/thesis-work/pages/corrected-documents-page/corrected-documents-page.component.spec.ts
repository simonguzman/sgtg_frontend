// 1. Angular Core y Testing
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, EventEmitter, Input, Output, signal, WritableSignal } from '@angular/core';

// 2. Componente a probar
import { CorrectedDocumentsPageComponent } from './corrected-documents-page.component';

// 3. Servicios, Facades y Enums
import { CorrectedDocumentsFacadeService } from './services/corrected-documents-facade.service';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { stateList } from '../../../../core/enums/state.enum';
import { DocumentType } from '../../../../core/enums/document-type.enum';

// 4. Modelos e Interfaces
import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { CorrectedDeliveryTableRow, CORRECTED_DOCUMENTS_COLUMNS } from './models/corrected-documents-page.model';
import { CorrectedDelivery } from '../../interfaces/corrected-delivery.interface';
import { FileDocument } from '../../../../core/interfaces/file-document.interface';

// 5. Componentes Basekit (Para overriding)
import { TableComponent, Column } from '../../../../shared/components/table-component/table-component.component';
import { ButtonComponent } from '../../../../shared/components/button-component/button-component.component';
import { RegisterInformationModalComponent } from '../../../../shared/components/modals/register-information-modal/register-information-modal.component';
import { InfoBannerComponent } from '../../../../shared/components/info-banner/info-banner.component';

// ── Tipos Seguros para los Mocks (Zero 'any', 'unknown' ni casteos dobles) ──

interface MockCorrectedDocumentsFacadeService {
  findThesisWork: jest.Mock<ThesisWork | null, [string | null, ThesisWork[]]>;
  isDirector: jest.Mock<boolean, [ThesisWork | null]>;
  isJuror: jest.Mock<boolean, [ThesisWork | null]>;
  canDirectorUpload: jest.Mock<boolean, [ThesisWork | null, boolean, boolean]>;
  canJurorEvaluate: jest.Mock<boolean, [ThesisWork | null, boolean, boolean]>;
  buildTableData: jest.Mock<CorrectedDeliveryTableRow[], [ThesisWork | null]>;
  getDeliveryDocumentNames: jest.Mock<string[], [CorrectedDelivery | null]>;
  getStudentName: jest.Mock<string, [ThesisWork | null]>;
  getDirectorName: jest.Mock<string, [ThesisWork | null]>;
  getCodirectorName: jest.Mock<string | undefined, [ThesisWork | null]>;
  getAdvisorName: jest.Mock<string | undefined, [ThesisWork | null]>;
  downloadDocumentByName: jest.Mock<Promise<void>, [CorrectedDelivery | null, string]>;
  showNavigationError: jest.Mock<void, []>;
}

interface MockRouter {
  url: string;
  navigate: jest.Mock<Promise<boolean>, [any[], any?]>;
}

interface MockParamMap {
  get: jest.Mock<string | null, [string]>;
}

interface MockRouteSnapshot {
  paramMap: MockParamMap;
  data: Record<string, boolean>;
}

interface MockActivatedRoute {
  snapshot: MockRouteSnapshot;
  parent: MockActivatedRoute | null;
}

interface MockBreadcrumbService {
  clearDynamicBreadcrumb: jest.Mock<void, []>;
  setDynamicTitle: jest.Mock<void, [string | null]>;
}

interface MockThesisWorkService {
  allThesisWorks: WritableSignal<ThesisWork[]>;
}

// ── Mocks de Componentes Standalone (Strict-Init sin 'unknown') ─────────────

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: CorrectedDeliveryTableRow[] = [];
  @Input() columns: Column[] = [];
  @Input() paginator = false;
  @Input() emptyMessage = '';
  @Output() actionClick = new EventEmitter<{ action: string; row: CorrectedDeliveryTableRow }>();
}

@Component({ selector: 'app-button-component', standalone: true, template: '' })
class MockButtonComponent {
  @Input() label = '';
  @Input() variant = '';
  @Output() onClick = new EventEmitter<void>();
}

@Component({ selector: 'app-register-information-modal', standalone: true, template: '' })
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
  @Input() chargeDate: string | Date = '';
  @Input() state: string | undefined = undefined;
  @Input() documents: string[] = [];
  @Output() onClose = new EventEmitter<void>();
  @Output() onDownloadFile = new EventEmitter<string>();
}

@Component({ selector: 'app-info-banner', standalone: true, template: '<ng-content></ng-content>' })
class MockInfoBannerComponent {
  @Input() title = '';
}

// ── Funciones Fábrica fuertemente tipadas ────────────────────────────────────

const createMockFileDocument = (overrides: Partial<FileDocument> = {}): FileDocument => ({
  id: 'doc-1',
  name: 'documento',
  url: 'http://url.com/doc.pdf',
  type: DocumentType.MONOGRAFIA,
  uploadDate: new Date(),
  ...overrides
});

const createMockThesisWork = (overrides: Partial<ThesisWork> = {}): ThesisWork => ({
  thesisWorkId: 'tw-123',
  preliminaryDraftId: 'draft-1',
  documents: [],
  evaluations: [],
  specialRequests: [],
  correctedDeliveries: [],
  sustentations: [],
  state: stateList.EN_DESARROLLO,
  createdDate: new Date(),
  preliminaryDraftData: {} as any, // Irrelevante aquí, se maneja en el Facade
  ...overrides
});

const createMockDelivery = (overrides: Partial<CorrectedDelivery> = {}): CorrectedDelivery => ({
  id: 'd-1',
  uploadDate: new Date(),
  status: stateList.EN_REVISION,
  // 🔨 Usamos la fábrica para proveer objetos FileDocument válidos
  monograph: createMockFileDocument({ name: 'monografia' }),
  annexes: createMockFileDocument({ name: 'anexos', type: DocumentType.ANEXOS }),
  ...overrides
});

const createMockTableRow = (rawDelivery: CorrectedDelivery): CorrectedDeliveryTableRow => ({
  id: rawDelivery.id,
  name: 'Paquete de Correcciones',
  date: '2026-08-24',
  status: rawDelivery.status || stateList.EN_REVISION,
  allowedActions: ['view-details'],
  rawDelivery
});

// ── Inicio de la Suite de Pruebas ───────────────────────────────────────────

describe('CorrectedDocumentsPageComponent', () => {
  let component: CorrectedDocumentsPageComponent;
  let fixture: ComponentFixture<CorrectedDocumentsPageComponent>;

  // Mocks Tipados Estrictamente
  let facadeSpy: MockCorrectedDocumentsFacadeService;
  let routerSpy: MockRouter;
  let breadcrumbSpy: MockBreadcrumbService;
  let thesisWorkServiceSpy: MockThesisWorkService;

  // Nodos de ruta para anidación
  let routeSnapshotMock: MockRouteSnapshot;
  let parentSnapshotMock: MockRouteSnapshot;
  let grandParentSnapshotMock: MockRouteSnapshot;
  let routeSpy: MockActivatedRoute;

  beforeEach(async () => {
    // 🔕 Silenciador preventivo global de consola
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // 1. Inicialización de Fachada y Servicios
    facadeSpy = {
      findThesisWork: jest.fn().mockReturnValue(null),
      isDirector: jest.fn().mockReturnValue(false),
      isJuror: jest.fn().mockReturnValue(false),
      canDirectorUpload: jest.fn().mockReturnValue(false),
      canJurorEvaluate: jest.fn().mockReturnValue(false),
      buildTableData: jest.fn().mockReturnValue([]),
      getDeliveryDocumentNames: jest.fn().mockReturnValue([]),
      getStudentName: jest.fn().mockReturnValue(''),
      getDirectorName: jest.fn().mockReturnValue(''),
      getCodirectorName: jest.fn().mockReturnValue(undefined),
      getAdvisorName: jest.fn().mockReturnValue(undefined),
      downloadDocumentByName: jest.fn().mockResolvedValue(undefined),
      showNavigationError: jest.fn()
    };

    routerSpy = {
      url: '/thesis-work/details/tw-123/corrected_documents',
      navigate: jest.fn().mockResolvedValue(true)
    };

    breadcrumbSpy = {
      clearDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn()
    };

    thesisWorkServiceSpy = {
      allThesisWorks: signal<ThesisWork[]>([])
    };

    // 2. Configuración del árbol de rutas simulado (Componente -> Padre -> Abuelo)
    grandParentSnapshotMock = { paramMap: { get: jest.fn().mockReturnValue('tw-123') }, data: {} };
    parentSnapshotMock = { paramMap: { get: jest.fn().mockReturnValue(null) }, data: {} };
    routeSnapshotMock = { paramMap: { get: jest.fn().mockReturnValue(null) }, data: { isArchived: false } };

    routeSpy = {
      snapshot: routeSnapshotMock,
      parent: {
        snapshot: parentSnapshotMock,
        parent: { snapshot: grandParentSnapshotMock, parent: null }
      }
    };

    await TestBed.configureTestingModule({
      imports: [CorrectedDocumentsPageComponent],
      providers: [
        { provide: CorrectedDocumentsFacadeService, useValue: facadeSpy },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeSpy },
        { provide: BreadcrumbService, useValue: breadcrumbSpy },
        { provide: ThesisWorkService, useValue: thesisWorkServiceSpy }
      ]
    })
    .overrideComponent(CorrectedDocumentsPageComponent, {
      remove: { imports: [TableComponent, ButtonComponent, RegisterInformationModalComponent, InfoBannerComponent] },
      add: { imports: [MockTableComponent, MockButtonComponent, MockRegisterInformationModalComponent, MockInfoBannerComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorrectedDocumentsPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola
  });

  describe('ngOnInit e inicialización', () => {
    it('debe crearse correctamente', () => {
      fixture.detectChanges();
      expect(component).toBeTruthy();
    });

    it('debe extraer el ID de la ruta abuelo si no está en la actual ni el padre', () => {
      fixture.detectChanges();
      expect(component.thesisWorkId()).toBe('tw-123');
      expect(grandParentSnapshotMock.paramMap.get).toHaveBeenCalledWith('id');
    });

    it('debe extraer el ID directamente de la ruta actual si existe', () => {
      routeSnapshotMock.paramMap.get.mockReturnValue('tw-direct-99');
      fixture.detectChanges();
      expect(component.thesisWorkId()).toBe('tw-direct-99');
    });

    it('debe detectar si está archivado por el parámetro de ruta data', () => {
      routeSnapshotMock.data = { isArchived: true };
      fixture.detectChanges();
      expect(component.isArchived()).toBe(true);
    });

    it('debe detectar si está archivado por la URL (history)', () => {
      routerSpy.url = '/thesis-work/history/details/tw-123';
      fixture.detectChanges();
      expect(component.isArchived()).toBe(true);
    });

    it('debe mostrar error de navegación y regresar si no encuentra el ID en ningún nivel', () => {
      routeSnapshotMock.paramMap.get.mockReturnValue(null);
      parentSnapshotMock.paramMap.get.mockReturnValue(null);
      grandParentSnapshotMock.paramMap.get.mockReturnValue(null);

      fixture.detectChanges();

      expect(facadeSpy.showNavigationError).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/thesis-work']);
    });
  });

  describe('ngOnDestroy', () => {
    it('debe limpiar los breadcrumbs al destruirse', () => {
      fixture.detectChanges();
      component.ngOnDestroy();
      expect(breadcrumbSpy.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(breadcrumbSpy.setDynamicTitle).toHaveBeenCalledWith(null);
    });
  });

  describe('Interacciones (Eventos de la tabla y descargas)', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('handleTableAction debe abrir el modal y setear selectedDelivery', () => {
      const rawDelivery = createMockDelivery({ id: 'd-123' });
      const row = createMockTableRow(rawDelivery);

      const event = { action: 'view-details', row: row };

      component.handleTableAction(event);

      expect(component.selectedDelivery()).toEqual(rawDelivery);
      expect(component.isDetailsModalOpen()).toBe(true);
    });

    it('downloadDocumentByName debe invocar al facade correctamente (async void)', () => {
      const rawDelivery = createMockDelivery({ id: 'd-999' });
      component.selectedDelivery.set(rawDelivery);

      component.downloadDocumentByName('documento.pdf');

      expect(facadeSpy.downloadDocumentByName).toHaveBeenCalledWith(rawDelivery, 'documento.pdf');
    });
  });

  describe('Navegación', () => {
    beforeEach(() => {
      fixture.detectChanges();
    });

    it('navigateToUploadCorrections debe navegar relativo a la ruta actual', () => {
      component.navigateToUploadCorrections();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['upload_corrections'], { relativeTo: routeSpy });
    });

    it('navigateToEvaluateCorrections debe navegar relativo a la ruta actual', () => {
      component.navigateToEvaluateCorrections();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['evaluate_corrections'], { relativeTo: routeSpy });
    });

    it('goBack debe volver a view_sustentation_details si el proyecto tiene sustentaciones', () => {
      const thesisWithSustentation = createMockThesisWork({
        sustentations: [{ id: 'sus-999', sustentationDate: new Date(), location: '', verdicts: [], assignedJurors: [] }]
      });
      facadeSpy.findThesisWork.mockReturnValue(thesisWithSustentation);

      thesisWorkServiceSpy.allThesisWorks.set([thesisWithSustentation]);
      routerSpy.url = '/thesis-work/details/tw-123/corrected_documents';

      component.goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/thesis-work',
        'details',
        'tw-123',
        'view_sustentation_details',
        'sus-999'
      ]);
    });

    it('goBack debe volver a loaded_documents si el proyecto no tiene sustentaciones', () => {
      const thesisEmpty = createMockThesisWork({ sustentations: [] });
      facadeSpy.findThesisWork.mockReturnValue(thesisEmpty);
      thesisWorkServiceSpy.allThesisWorks.set([thesisEmpty]);

      routerSpy.url = '/history/details/tw-123/corrected_documents';

      component.goBack();

      expect(routerSpy.navigate).toHaveBeenCalledWith([
        '/history',
        'details',
        'tw-123',
        'loaded_documents'
      ]);
    });
  });
});
