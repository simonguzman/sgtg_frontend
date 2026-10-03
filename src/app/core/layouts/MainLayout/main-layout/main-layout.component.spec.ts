import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule, ActivatedRouteSnapshot, ParamMap } from '@angular/router';
import { signal, WritableSignal, Component } from '@angular/core';
import { MainLayoutComponent } from './main-layout.component';
import { BreadcrumbService } from '../../../services/breadcrumb/breadcrumb.service';
import { DeadlineMonitorService } from '../../../../modules/notifications/services/deadline-monitor.service';
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../../../components/breadcrumb/breadcrumb.component';

@Component({ selector: 'app-footer', template: '', standalone: true })
class MockFooterComponent {}

@Component({ selector: 'app-header', template: '', standalone: true })
class MockHeaderComponent {}

@Component({ selector: 'app-sidebar', template: '', standalone: true })
class MockSidebarComponent {}

@Component({ selector: 'app-breadcrumb', template: '', standalone: true })
class MockBreadcrumbComponent {}

interface MockBreadcrumbService {
  routerStateSnapshot: WritableSignal<{ root: ActivatedRouteSnapshot | null }>;
  dynamicTitle: WritableSignal<string | null>;
}

interface MockDeadlineMonitorService {
  checkDeadlines: jest.Mock<void, []>;
}

const createMockRouteSnapshot = (title?: string, firstChild: ActivatedRouteSnapshot | null = null): ActivatedRouteSnapshot => {
  const dummyParamMap: ParamMap = { has: () => false, get: () => null, getAll: () => [], keys: [] };
  const snapshot: ActivatedRouteSnapshot = {
    url: [], params: {}, queryParams: {}, fragment: null, data: {}, outlet: 'primary',
    component: null, routeConfig: null,
    get root() { return snapshot; },
    parent: null, firstChild, children: firstChild ? [firstChild] : [],
    pathFromRoot: [], paramMap: dummyParamMap, queryParamMap: dummyParamMap, title
  };

  return snapshot;
};

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let mockBreadcrumbService: MockBreadcrumbService;
  let mockDeadlineMonitorService: MockDeadlineMonitorService;

  beforeEach(async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    mockBreadcrumbService = {
      routerStateSnapshot: signal({ root: createMockRouteSnapshot('Título Estático') }),
      dynamicTitle: signal<string | null>(null)
    };

    mockDeadlineMonitorService = {
      checkDeadlines: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent, RouterModule.forRoot([])],
      providers: [
        { provide: BreadcrumbService, useValue: mockBreadcrumbService },
        { provide: DeadlineMonitorService, useValue: mockDeadlineMonitorService }
      ]
    })
    .overrideComponent(MainLayoutComponent, {
      remove: { imports: [FooterComponent, HeaderComponent, SidebarComponent, BreadcrumbComponent] },
      add: { imports: [MockFooterComponent, MockHeaderComponent, MockSidebarComponent, MockBreadcrumbComponent] }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('Inicialización', () => {
    it('debería crearse correctamente', () => {
      expect(component).toBeTruthy();
    });

    it('debería llamar a checkDeadlines() del DeadlineMonitorService al construirse', () => {
      expect(mockDeadlineMonitorService.checkDeadlines).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cálculo del Título de la Página (currentPageTitle)', () => {
    it('debería usar el título estático de la ruta si el título dinámico es nulo', () => {
      expect(component['currentPageTitle']()).toBe('Título Estático');
    });

    it('debería dar prioridad al título dinámico si el BreadcrumbService lo provee', () => {
      mockBreadcrumbService.dynamicTitle.set('Título Dinámico (Propuesta #123)');
      fixture.detectChanges();
      expect(component['currentPageTitle']()).toBe('Título Dinámico (Propuesta #123)');
    });

    it('debería actualizar el título si el estado del router cambia (título estático)', () => {
      mockBreadcrumbService.routerStateSnapshot.set({ root: createMockRouteSnapshot('Nueva Ruta') });
      fixture.detectChanges();
      expect(component['currentPageTitle']()).toBe('Nueva Ruta');
    });

    it('debería retornar "Inicio" si no hay título dinámico ni título en la ruta', () => {
      mockBreadcrumbService.routerStateSnapshot.set({ root: createMockRouteSnapshot(undefined) });
      fixture.detectChanges();
      expect(component['currentPageTitle']()).toBe('Inicio');
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería mostrar el título actual evaluado en la etiqueta h2', () => {
      mockBreadcrumbService.dynamicTitle.set('Renderizado Correcto');
      fixture.detectChanges();
      const h2Element = fixture.nativeElement.querySelector('h2');
      expect(h2Element).toBeTruthy();
      expect(h2Element?.textContent?.trim()).toBe('Renderizado Correcto');
    });
  });
});
