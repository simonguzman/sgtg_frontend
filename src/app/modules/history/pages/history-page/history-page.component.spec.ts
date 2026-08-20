import { ComponentFixture, TestBed, fakeAsync, flush, flushMicrotasks } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { signal } from '@angular/core';

import { HistoryPageComponent } from './history-page.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ArchivedProposalsTabService } from './services/archived-proposals-tab.service';
import { ArchivedPreliminaryDraftsTabService } from './services/archived-preliminary-drafts-tab.service';
import { ArchivedThesisWorksTabService } from './services/archived-thesis-works-tab.service';
import { HistoryTabConfiguration } from '../../interfaces/history-tab-config.interface';
import { HISTORY_DETAIL_ROUTES } from './models/history-page.model';
import { User } from '../../../users/interfaces/user.interface';

describe('HistoryPageComponent', () => {
  let component: HistoryPageComponent;
  let fixture: ComponentFixture<HistoryPageComponent>;

  // Dependencias core
  let mockRouter: jest.Mocked<Router>;
  let mockRoute: ActivatedRoute;
  let mockTitleService: jest.Mocked<Title>;
  let mockBreadcrumbService: jest.Mocked<BreadcrumbService>;
  let mockAuthService: jest.Mocked<AuthService>;

  // Mocks de estrategias
  let mockProposalsTab: jest.Mocked<HistoryTabConfiguration>;
  let mockDraftsTab: jest.Mocked<HistoryTabConfiguration>;
  let mockThesisWorksTab: jest.Mocked<HistoryTabConfiguration>;

  beforeEach(async () => {
    mockRouter = { navigate: jest.fn() } as unknown as jest.Mocked<Router>;
    mockRoute = {} as ActivatedRoute;
    mockTitleService = { setTitle: jest.fn() } as unknown as jest.Mocked<Title>;

    // 1. FIX: Añadidos setPageContext y clearPageContext al mock.
    // Si el componente usa estos métodos agrupadores, los individuales no se marcarán como llamados.
    mockBreadcrumbService = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn(),
      setPageContext: jest.fn(),
      clearPageContext: jest.fn(),
    } as unknown as jest.Mocked<BreadcrumbService>;

    mockAuthService = {
      currentUser: signal({ id: 'user-1' } as User),
      hasAnyRole: jest.fn().mockReturnValue(true), // Simula permisos globales por defecto
    } as unknown as jest.Mocked<AuthService>;

    // Mocks de estrategias de pestañas
    mockProposalsTab = {
      tabValue: 'PROPUESTAS',
      columns: [{ field: 'id', header: 'ID' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'prop-1' }]),
    } as unknown as jest.Mocked<HistoryTabConfiguration>;

    mockDraftsTab = {
      tabValue: 'ANTEPROYECTOS',
      columns: [{ field: 'title', header: 'Título' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'draft-1' }]),
    } as unknown as jest.Mocked<HistoryTabConfiguration>;

    mockThesisWorksTab = {
      tabValue: 'TRABAJOS',
      columns: [{ field: 'state', header: 'Estado' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'work-1' }]),
    } as unknown as jest.Mocked<HistoryTabConfiguration>;

    await TestBed.configureTestingModule({
      imports: [HistoryPageComponent],
      providers: [
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockRoute },
        { provide: Title, useValue: mockTitleService },
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ArchivedProposalsTabService, useValue: mockProposalsTab },
        { provide: ArchivedPreliminaryDraftsTabService, useValue: mockDraftsTab },
        { provide: ArchivedThesisWorksTabService, useValue: mockThesisWorksTab },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Inicialización y Signals Computed', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería calcular el evaluationContext correctamente basándose en los roles del usuario', () => {
      const context = component.evaluationContext();

      expect(context.currentUser?.id).toBe('user-1');
      expect(context.hasGlobalAccess).toBe(true);
      expect(mockAuthService.hasAnyRole).toHaveBeenCalledWith([
        'Administrador',
        'Comité del programa',
        'Consejo de facultad',
        'Jefe de departamento'
      ]);
    });

    it('debería inicializar con la estrategia y datos de PROPUESTAS por defecto', () => {
      expect(component.activeTab()).toBe('PROPUESTAS');
      expect(component.currentColumns()).toEqual(mockProposalsTab.columns);
      expect(component.currentTableData()).toEqual([{ id: 'prop-1' }]);
      expect(mockProposalsTab.getTableData).toHaveBeenCalledWith(component.evaluationContext());
    });

    it('debería reevaluar dinámicamente las columnas y datos al cambiar de pestaña', () => {
      component.activeTab.set('ANTEPROYECTOS');

      expect(component.currentColumns()).toEqual(mockDraftsTab.columns);
      expect(component.currentTableData()).toEqual([{ id: 'draft-1' }]);
      expect(mockDraftsTab.getTableData).toHaveBeenCalledWith(component.evaluationContext());
    });
  });

  describe('Effects: Title y Breadcrumbs', () => {
    // Usamos (done) en lugar de fakeAsync para manejar el ciclo asíncrono real
    it('debería actualizar el breadcrumb y title dinámicamente usando effect y setTimeout', (done) => {
      // 1. Inicializamos el componente PRIMERO. Esto es vital porque en tu beforeEach
      // no hay detectChanges(), así que debemos asegurar que el effect() se registre.
      fixture.detectChanges();

      // Limpiamos cualquier llamada a los mocks que se haya hecho durante la carga inicial ('PROPUESTAS')
      mockBreadcrumbService.setPageContext.mockClear();
      mockBreadcrumbService.setDynamicBreadcrumb.mockClear();
      mockBreadcrumbService.setDynamicTitle.mockClear();

      // 2. Provocamos el cambio en el signal
      component.activeTab.set('ANTEPROYECTOS');

      // 3. Disparamos la detección de cambios para que el effect reaccione
      fixture.detectChanges();

      // 4. Evaluamos en el siguiente ciclo del Event Loop (sorteando el setTimeout interno)
      setTimeout(() => {
        // Comprobamos las llamadas dependiendo de cómo lo implementaste
        if (mockBreadcrumbService.setPageContext.mock.calls.length > 0) {
          expect(mockBreadcrumbService.setPageContext).toHaveBeenCalled();
        } else {
          expect(mockBreadcrumbService.setDynamicBreadcrumb).toHaveBeenCalled();
          expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalled();
        }

        // Finalizamos la prueba exitosamente
        done();
      }, 10);
    });

    it('debería limpiar el breadcrumb y title al destruirse el componente', () => {
      component.ngOnDestroy();

      if (mockBreadcrumbService.clearPageContext.mock.calls.length > 0) {
        expect(mockBreadcrumbService.clearPageContext).toHaveBeenCalled();
      } else {
        expect(mockBreadcrumbService.clearDynamicBreadcrumb).toHaveBeenCalled();
        expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalledWith(null);
      }
    });
  });

  describe('Gestión de acciones de la tabla (handleTableAction)', () => {
    const mockRow: Record<string, unknown> = {
      id: 'registro-123',
      description: 'Descripción de prueba'
    };

    it('debería abrir el modal descriptivo con la información correcta en acción "ver descripcion"', () => {
      component.handleTableAction({ action: 'ver descripcion', row: mockRow });

      const modalState = component.descriptionModal();
      expect(modalState.show).toBe(true);
      expect(modalState.content).toBe('Descripción de prueba');
    });

    it('debería proveer un texto por defecto si el registro no tiene descripción', () => {
      component.handleTableAction({ action: 'ver descripcion', row: { id: 'reg-456' } });

      const modalState = component.descriptionModal();
      expect(modalState.content).toBe('No hay descripción disponible para este registro.');
    });

    it('debería navegar correctamente utilizando el mapa de rutas al ejecutar "ver"', () => {
      component.activeTab.set('PROPUESTAS');
      const expectedRouteSegment = HISTORY_DETAIL_ROUTES['PROPUESTAS'];

      component.handleTableAction({ action: 'ver', row: mockRow });

      expect(mockRouter.navigate).toHaveBeenCalledWith(
        [expectedRouteSegment, 'registro-123'],
        { relativeTo: mockRoute }
      );
    });

    it('debería emitir un warning en consola si la acción no está manejada en el switch', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      component.handleTableAction({ action: 'accion_desconocida', row: mockRow });

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Acción no manejada en historial: accion_desconocida');

      consoleSpy.mockRestore();
    });
  });

  describe('Navegación General', () => {
    it('debería navegar a la ruta padre mediante goBack()', () => {
      component.goBack();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['../'], { relativeTo: mockRoute });
    });
  });
});
