import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, ActivatedRoute } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { signal, WritableSignal, Component, Input, Output, EventEmitter } from '@angular/core';

import { HistoryPageComponent } from './history-page.component';
import { BreadcrumbService } from '../../../../core/services/breadcrumb/breadcrumb.service';
import { AuthService } from '../../../../core/services/auth/auth.service';
import { ArchivedProposalsTabService } from './services/archived-proposals-tab.service';
import { ArchivedPreliminaryDraftsTabService } from './services/archived-preliminary-drafts-tab.service';
import { ArchivedThesisWorksTabService } from './services/archived-thesis-works-tab.service';
import { HISTORY_DETAIL_ROUTES } from './models/history-page.model';
import { User } from '../../../users/interfaces/user.interface';
import { HistoryEvaluationContext } from '../../interfaces/history-evaluation-context.interface';

// ── Componentes Originales a Remover ─────────────────────────────────────────
import { TabsComponent } from '../../../../shared/components/tabs/tabs.component';
import { TableComponent } from '../../../../shared/components/table-component/table-component.component';
import { DescriptionModalComponent } from '../../../../shared/components/modals/description-modal/description-modal.component';

// ── Mocks de Componentes Hijos (Shallow Testing) ─────────────────────────────

@Component({ selector: 'app-tabs', standalone: true, template: '' })
class MockTabsComponent {
  @Input() tabs: Array<{ label: string; value: string }> = [];
  @Input() activeTab = '';
  @Output() tabChange = new EventEmitter<string>();
}

@Component({ selector: 'app-table-component', standalone: true, template: '' })
class MockTableComponent {
  @Input() value: Record<string, unknown>[] = [];
  @Input() columns: Array<{ field: string; header: string }> = [];
  @Input() paginator = false;
  @Input() emptyMessage = '';
  @Output() actionClick = new EventEmitter<{ action: string; row: Record<string, unknown> }>();
}

@Component({ selector: 'app-description-modal', standalone: true, template: '' })
class MockDescriptionModalComponent {
  @Input() isOpen = false;
  @Input() titleDescription = '';
  @Input() description = '';
  @Output() onClose = new EventEmitter<void>();
}

// ── Tipados Estrictos para Mocks (Zero 'any' o 'unknown') ────────────────────

interface MockHistoryTabConfiguration {
  tabValue: string;
  columns: Array<{ field: string; header: string }>;
  getTableData: jest.Mock<Record<string, unknown>[], [HistoryEvaluationContext]>;
}

describe('HistoryPageComponent', () => {
  let component: HistoryPageComponent;
  let fixture: ComponentFixture<HistoryPageComponent>;

  // Dependencias core con interfaces estrictas
  let mockRouter: { navigate: jest.Mock };
  let mockRoute: Partial<ActivatedRoute>;
  let mockTitleService: { setTitle: jest.Mock };
  let mockBreadcrumbService: {
    setDynamicBreadcrumb: jest.Mock;
    setDynamicTitle: jest.Mock;
    clearDynamicBreadcrumb: jest.Mock;
    setPageContext: jest.Mock;
    clearPageContext: jest.Mock;
  };
  let mockAuthService: {
    currentUser: WritableSignal<User | null>;
    hasAnyRole: jest.Mock<boolean, [string[]]>;
  };

  // Mocks de estrategias
  let mockProposalsTab: MockHistoryTabConfiguration;
  let mockDraftsTab: MockHistoryTabConfiguration;
  let mockThesisWorksTab: MockHistoryTabConfiguration;

  beforeEach(async () => {
    // 🔕 Silenciar los console.error y console.warn
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockRouter = { navigate: jest.fn() };
    mockRoute = {}; // Referencia vacía suficiente para relativeTo
    mockTitleService = { setTitle: jest.fn() };

    mockBreadcrumbService = {
      setDynamicBreadcrumb: jest.fn(),
      setDynamicTitle: jest.fn(),
      clearDynamicBreadcrumb: jest.fn(),
      setPageContext: jest.fn(),
      clearPageContext: jest.fn(),
    };

    mockAuthService = {
      currentUser: signal({ id: 'user-1' } as User),
      hasAnyRole: jest.fn().mockReturnValue(true),
    };

    // Mocks de estrategias de pestañas (Polimorfismo)
    mockProposalsTab = {
      tabValue: 'PROPUESTAS',
      columns: [{ field: 'id', header: 'ID' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'prop-1' }]),
    };

    mockDraftsTab = {
      tabValue: 'ANTEPROYECTOS',
      columns: [{ field: 'title', header: 'Título' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'draft-1' }]),
    };

    mockThesisWorksTab = {
      tabValue: 'TRABAJOS',
      columns: [{ field: 'state', header: 'Estado' }],
      getTableData: jest.fn().mockReturnValue([{ id: 'work-1' }]),
    };

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
    })
    .overrideComponent(HistoryPageComponent, {
      remove: {
        imports: [TabsComponent, TableComponent, DescriptionModalComponent]
      },
      add: {
        imports: [MockTabsComponent, MockTableComponent, MockDescriptionModalComponent]
      }
    })
    .compileComponents();

    fixture = TestBed.createComponent(HistoryPageComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar los espías de consola
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
    // FIX CENTRAL: Eliminado fakeAsync. Usamos async/await + fixture.whenStable()
    // Esto previene que el zone.js atrape el effect de los Signals de forma errática.
    it('debería actualizar el breadcrumb y title dinámicamente usando effect y setTimeout', async () => {
      fixture.detectChanges(); // Ejecuta el primer effect al inicializar
      await fixture.whenStable(); // Espera a que se vacíe la cola asíncrona real

      // Limpiamos las llamadas de inicialización
      mockBreadcrumbService.setDynamicBreadcrumb.mockClear();
      mockBreadcrumbService.setDynamicTitle.mockClear();

      // Cambio de estado reactivo
      component.activeTab.set('ANTEPROYECTOS');
      fixture.detectChanges(); // Dispara la reactividad del effect
      await fixture.whenStable(); // Resuelve el nuevo setTimeout

      expect(mockBreadcrumbService.setDynamicBreadcrumb).toHaveBeenCalled();
      expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalled();
    });

    it('debería limpiar el breadcrumb y title al destruirse el componente', () => {
      component.ngOnDestroy();
      expect(mockBreadcrumbService.clearDynamicBreadcrumb).toHaveBeenCalled();
      expect(mockBreadcrumbService.setDynamicTitle).toHaveBeenCalledWith(null);
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
      // Como ya silenciamos el console.warn en el beforeEach,
      // simplemente afirmamos que el espía haya sido llamado.
      component.handleTableAction({ action: 'accion_desconocida', row: mockRow });

      expect(mockRouter.navigate).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Acción no manejada en historial: accion_desconocida');
    });
  });
});
