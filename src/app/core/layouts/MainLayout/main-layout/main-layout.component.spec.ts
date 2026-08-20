import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainLayoutComponent } from './main-layout.component';
import { BreadcrumbService } from '../../../services/breadcrumb/breadcrumb.service';
import { DeadlineMonitorService } from '../../../../modules/notifications/services/deadline-monitor.service';
import { ActivatedRouteSnapshot } from '@angular/router';
import { signal, WritableSignal, Component } from '@angular/core';
import { RouterModule } from '@angular/router';

// 1. Mocks de Componentes Hijos importados originalmente
import { FooterComponent } from '../footer/footer.component';
import { HeaderComponent } from '../header/header.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { BreadcrumbComponent } from '../../../components/breadcrumb/breadcrumb.component';

@Component({ selector: 'app-footer', template: '' })
class MockFooterComponent {}

@Component({ selector: 'app-header', template: '' })
class MockHeaderComponent {}

@Component({ selector: 'app-sidebar', template: '' })
class MockSidebarComponent {}

@Component({ selector: 'app-breadcrumb', template: '' })
class MockBreadcrumbComponent {}

// 2. Interfaces estrictas para no usar 'any' en los mocks de servicios
interface MockBreadcrumbService {
  routerStateSnapshot: WritableSignal<{ root: ActivatedRouteSnapshot | null }>;
  dynamicTitle: WritableSignal<string | null>;
}

interface MockDeadlineMonitorService {
  checkDeadlines: jest.Mock;
}

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;

  let mockBreadcrumbService: MockBreadcrumbService;
  let mockDeadlineMonitorService: MockDeadlineMonitorService;

  // Utilidad para instanciar el snapshot sin 'any'
  const createSnapshot = (title?: string): ActivatedRouteSnapshot => {
    return { title, firstChild: null } as unknown as ActivatedRouteSnapshot;
  };

  beforeEach(async () => {
    mockBreadcrumbService = {
      routerStateSnapshot: signal({ root: createSnapshot('Título Estático') }),
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
      // El setup inicial tiene dynamicTitle en null y el estático en 'Título Estático'
      expect(component['currentPageTitle']()).toBe('Título Estático');
    });

    it('debería dar prioridad al título dinámico si el BreadcrumbService lo provee', () => {
      mockBreadcrumbService.dynamicTitle.set('Título Dinámico (Propuesta #123)');
      fixture.detectChanges();

      expect(component['currentPageTitle']()).toBe('Título Dinámico (Propuesta #123)');
    });

    it('debería actualizar el título si el estado del router cambia (título estático)', () => {
      mockBreadcrumbService.routerStateSnapshot.set({ root: createSnapshot('Nueva Ruta') });
      fixture.detectChanges();

      expect(component['currentPageTitle']()).toBe('Nueva Ruta');
    });

    it('debería retornar "Inicio" si no hay título dinámico ni título en la ruta', () => {
      mockBreadcrumbService.routerStateSnapshot.set({ root: createSnapshot(undefined) });
      fixture.detectChanges();

      expect(component['currentPageTitle']()).toBe('Inicio');
    });
  });

  describe('Renderizado del DOM', () => {
    it('debería mostrar el título actual evaluado en la etiqueta h2', () => {
      mockBreadcrumbService.dynamicTitle.set('Renderizado Correcto');
      fixture.detectChanges();

      const h2Element: HTMLElement = fixture.nativeElement.querySelector('h2');
      expect(h2Element.textContent?.trim()).toBe('Renderizado Correcto');
    });
  });
});
