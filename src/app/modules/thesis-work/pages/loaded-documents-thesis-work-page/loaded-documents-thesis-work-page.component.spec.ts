import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { signal, WritableSignal } from '@angular/core';

import { LoadedDocumentsThesisWorkPageComponent } from './loaded-documents-thesis-work-page.component';
import { ThesisWorkService } from '../../services/thesis-work.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { ThesisParticipantsFormatterService } from '../../services/thesis-participants-formatter.service';
import { LoadedDocumentsThesisWorkFacadeService } from './services/loaded-documents-thesis-work-facade.service';
import { ThesisWorkDetailsModalResolverService } from './services/thesis-work-details-modal-resolver.service';
import { TableButton } from '../../../../shared/components/table-component/table-component.component';

import { ThesisWork } from '../../interfaces/thesis-work.interface';
import { User } from '../../../users/interfaces/user.interface';
import { Advance } from '../../interfaces/advance.interface';
import { DocumentType } from '../../../../core/enums/document-type.enum';
import { TabConfiguration } from './tabs-logic/tab-config.interface';

describe('LoadedDocumentsThesisWorkPageComponent', () => {
  let component: LoadedDocumentsThesisWorkPageComponent;
  let fixture: ComponentFixture<LoadedDocumentsThesisWorkPageComponent>;

  let routerSpy: jest.Mocked<Router>;
  let facadeSpy: jest.Mocked<LoadedDocumentsThesisWorkFacadeService>;
  let resolverSpy: jest.Mocked<ThesisWorkDetailsModalResolverService>;
  let authSpy: jest.Mocked<Partial<AuthService>>;
  let breadcrumbSpy: jest.Mocked<BreadcrumbService>;
  let participantsSpy: jest.Mocked<ThesisParticipantsFormatterService>;
  let titleSpy: jest.Mocked<Title>;

  let thesisWorksSignal: WritableSignal<ThesisWork[]>;
  let currentUserSignal: WritableSignal<User | null>;
  let routeMock: ActivatedRoute;

  let originalAdvancesStrategy: TabConfiguration<unknown>;

  beforeEach(async () => {
    routerSpy = { navigate: jest.fn() } as unknown as jest.Mocked<Router>;

    facadeSpy = {
      uploadDocument: jest.fn((id, file, type, onSuccess, onError) => onSuccess()),
      downloadDocument: jest.fn(),
      downloadDocumentByName: jest.fn(),
      showRestrictedActionNotification: jest.fn(),
      showNotFoundError: jest.fn()
    } as unknown as jest.Mocked<LoadedDocumentsThesisWorkFacadeService>;

    resolverSpy = { resolve: jest.fn() } as unknown as jest.Mocked<ThesisWorkDetailsModalResolverService>;

    currentUserSignal = signal<User | null>({ id: 'user-123' } as User);
    authSpy = {
      currentUser: currentUserSignal,
      hasAnyRole: jest.fn().mockReturnValue(false)
    } as unknown as jest.Mocked<Partial<AuthService>>;

    breadcrumbSpy = {
      setDynamicBreadcrumb: jest.fn(),
      clearDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn()
    } as unknown as jest.Mocked<BreadcrumbService>;

    titleSpy = { setTitle: jest.fn() } as unknown as jest.Mocked<Title>;

    participantsSpy = {
      getStudentNames: jest.fn().mockReturnValue('Estudiante Mock'),
      getDirectorName: jest.fn().mockReturnValue('Director Mock'),
      getCodirectorName: jest.fn().mockReturnValue(undefined),
      getAdvisorName: jest.fn().mockReturnValue(undefined)
    } as unknown as jest.Mocked<ThesisParticipantsFormatterService>;

    routeMock = {
      snapshot: { paramMap: convertToParamMap({}) },
      firstChild: {
        snapshot: { paramMap: convertToParamMap({ id: 'id-from-child' }) },
        firstChild: null
      },
      parent: {
        snapshot: { paramMap: convertToParamMap({ id: 'id-from-parent' }) }
      }
    } as unknown as ActivatedRoute;

    const dummyThesis: Partial<ThesisWork> = {
      thesisWorkId: 'id-from-child',
      isArchived: false,
      documents: []
    };

    thesisWorksSignal = signal<ThesisWork[]>([dummyThesis as ThesisWork]);

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
    }).compileComponents();

    fixture = TestBed.createComponent(LoadedDocumentsThesisWorkPageComponent);
    component = fixture.componentInstance;

    // Almacenamos la estrategia original para restaurarla y evitar fugas de estado entre tests
    originalAdvancesStrategy = component['tabStrategies']['AVANCES'];

    fixture.detectChanges();
  });

  afterEach(() => {
    // Restablecemos las propiedades de la clase que fueron modificadas
    component['tabStrategies']['AVANCES'] = originalAdvancesStrategy;
    jest.clearAllMocks();
  });

  describe('Inicialización y Ciclo de Vida', () => {
    it('debe capturar el ID desde el child más profundo de la ruta en ngOnInit', () => {
      expect(component.thesisWorkId()).toBe('id-from-child');
    });

    it('debe actualizar breadcrumb y title a través del effect al cambiar la pestaña', (done) => {
      breadcrumbSpy.setDynamicBreadcrumb.mockClear();
      titleSpy.setTitle.mockClear();

      // 1. Cambiamos el valor de la signal
      component.activeTab.set('CORRESPONDENCIA');

      // 2. Disparamos la detección de cambios para que Angular marque el effect()
      fixture.detectChanges();

      // 3. Evaluamos en el siguiente ciclo del Event Loop para sortear el setTimeout interno
      setTimeout(() => {
        expect(breadcrumbSpy.setDynamicBreadcrumb).toHaveBeenCalledWith('Correspondencia');
        expect(titleSpy.setTitle).toHaveBeenCalledWith('Trabajo de Grado - Correspondencia');

        // Finalizamos la prueba asíncrona
        done();
      }, 10);
    });

    it('debe usar un valor por defecto para breadcrumb y title si la pestaña no se encuentra en la configuración', (done) => {
      breadcrumbSpy.setDynamicBreadcrumb.mockClear();
      titleSpy.setTitle.mockClear();

      component.activeTab.set('PESTANA_INEXISTENTE');

      // Disparamos la detección de cambios aquí también
      fixture.detectChanges();

      // Evaluamos en el siguiente ciclo del Event Loop
      setTimeout(() => {
        expect(breadcrumbSpy.setDynamicBreadcrumb).toHaveBeenCalledWith('Documentos');
        expect(titleSpy.setTitle).toHaveBeenCalledWith('Trabajo de Grado - Documentos');

        // Finalizamos la prueba asíncrona
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
      };

      // Forzar la reevaluación del computed de la estrategia
      component.activeTab.set('OTRA_PESTAÑA');
      fixture.detectChanges(); // Ejecuta el effect

      component.activeTab.set('AVANCES');
      fixture.detectChanges(); // Ejecuta el effect nuevamente

      // Esperamos a que el setTimeout interno del effect() termine para no "ensuciar" el siguiente test
      setTimeout(() => {
        const button: TableButton = { label: 'Subir', action: 'upload', variant: 'primary' };
        component.handleHeaderButton(button);

        expect(component.isUploadModalOpen()).toBe(true);
        expect(routerSpy.navigate).not.toHaveBeenCalled();

        done(); // Finalizamos la prueba asíncrona
      }, 10);
    });

    it('debe navegar si la estrategia actual tiene un headerActionRoute configurado', (done) => {
      component['tabStrategies']['AVANCES'] = {
        ...originalAdvancesStrategy,
        headerActionRoute: 'upload_advance'
      };

      // Forzar la reevaluación del computed de la estrategia
      component.activeTab.set('OTRA_PESTAÑA');
      fixture.detectChanges();

      component.activeTab.set('AVANCES');
      fixture.detectChanges();

      // Esperamos a que el setTimeout interno del effect() termine
      setTimeout(() => {
        const button: TableButton = { label: 'Ir', action: 'go', variant: 'primary' };
        component.handleHeaderButton(button);

        expect(routerSpy.navigate).toHaveBeenCalledWith(['upload_advance'], { relativeTo: routeMock.parent });

        done(); // Finalizamos la prueba asíncrona
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
      const mockAdvance: Partial<Advance> = { id: 'adv-resolved' };
      resolverSpy.resolve.mockReturnValue(mockAdvance as Advance);

      component.handleTableAction({ action: 'view-details', row: { id: 'adv-1' } });

      expect(component.isDetailsModalOpen()).toBe(true);
      expect(component.selectedAdvance()?.id).toBe('adv-resolved');

      component.downloadDocumentByName('mi_archivo.pdf');

      expect(facadeSpy.downloadDocumentByName).toHaveBeenCalledWith(
        'mi_archivo.pdf',
        'AVANCES',
        mockAdvance,
        component['currentThesisWork']()
      );
    });
  });

  describe('Manejo de archivos (Uploads)', () => {
    it('confirmUpload debe delegar al facade usando el tipo de documento configurado y luego cerrar el modal de confirmación', () => {
      const fileData = { fileName: 'doc.pdf', file: new File([], 'doc.pdf') };
      component.uploadContext.set(fileData);

      component['tabStrategies']['AVANCES'] = {
        ...originalAdvancesStrategy,
        modalConfig: { uploadDocumentType: DocumentType.AVANCE }
      } as TabConfiguration<unknown>;

      component.confirmUpload();

      expect(facadeSpy.uploadDocument).toHaveBeenCalledWith(
        'id-from-child',
        fileData,
        DocumentType.AVANCE,
        expect.any(Function),
        expect.any(Function)
      );
    });

    it('confirmUpload debe retornar tempranamente si falta el fileData, el thesisId o el docType', () => {
      component.uploadContext.set(null); // Provocar null
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
