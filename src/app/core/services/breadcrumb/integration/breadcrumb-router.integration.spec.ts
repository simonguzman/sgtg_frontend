import 'fake-indexeddb/auto';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, Routes } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { BreadcrumbService } from '../breadcrumb.service';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}
@Component({ template: '', standalone: true })
class DummyComponent {}

const testRoutes: Routes = [
  {
    path: 'modulo',
    data: { breadcrumb: 'Módulo de Prueba' },
    children: [
      { path: '', component: DummyComponent },
      { path: 'detalle/:id', component: DummyComponent, data: { breadcrumb: 'Detalle del Registro' } }
    ]
  },
  { path: 'sin-breadcrumb', component: DummyComponent }
];

describe('Integración [Core]: BreadcrumbService con Router real y navegación real', () => {
  let router: Router;
  let breadcrumbService: BreadcrumbService;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    TestBed.configureTestingModule({
      providers: [
        provideRouter(testRoutes),
        { provide: Title, useValue: { setTitle: jest.fn() } }
      ]
    });

    router = TestBed.inject(Router);
    breadcrumbService = TestBed.inject(BreadcrumbService);
  });

  it('debe construir el trail real recorriendo el árbol de rutas anidado tras una navegación real', async () => {
    await router.navigateByUrl('/modulo/detalle/123');
    expect(breadcrumbService.breadcrumbs()).toEqual([
      { label: 'Inicio', url: '/' },
      { label: 'Módulo de Prueba', url: '/modulo' },
      { label: 'Detalle del Registro', url: '/modulo/detalle/123' }
    ]);
  });

  it('debe recalcular reactivamente al navegar a una ruta sin breadcrumb declarado', async () => {
    await router.navigateByUrl('/modulo/detalle/123');
    expect(breadcrumbService.breadcrumbs()).toHaveLength(3);
    await router.navigateByUrl('/sin-breadcrumb');
    expect(breadcrumbService.breadcrumbs()).toEqual([{ label: 'Inicio', url: '/' }]);
  });

  it('setDynamicBreadcrumb debe anexarse al trail real construido por la navegación, no reemplazarlo', async () => {
    await router.navigateByUrl('/modulo/detalle/123');
    breadcrumbService.setDynamicBreadcrumb('Evaluando');
    expect(breadcrumbService.breadcrumbs()).toEqual([
      { label: 'Inicio', url: '/' },
      { label: 'Módulo de Prueba', url: '/modulo' },
      { label: 'Detalle del Registro', url: '/modulo/detalle/123' },
      { label: 'Evaluando', url: '/modulo/detalle/123' }
    ]);
  });

  it('documenta que dynamicLabel NO se limpia solo al navegar — confirma por qué cada página debe llamar clearDynamicBreadcrumb() en ngOnDestroy', async () => {
    await router.navigateByUrl('/modulo/detalle/123');
    breadcrumbService.setDynamicBreadcrumb('Contexto anterior');
    await router.navigateByUrl('/sin-breadcrumb');
    const trail = breadcrumbService.breadcrumbs();
    expect(trail.some(item => item.label === 'Contexto anterior')).toBe(true);
  });
});
