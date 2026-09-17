// src/app/core/services/breadcrumb/integration/breadcrumb-router.integration.spec.ts
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, Routes } from '@angular/router';
import { Title } from '@angular/platform-browser';

import { BreadcrumbService } from '../breadcrumb.service';

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

  beforeEach(() => {
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
    // dynamicLabel es un signal completamente independiente de
    // routerStateSnapshot — nada en el propio servicio lo resetea al
    // cambiar de ruta. Esto es justo lo que hace necesario el patrón que
    // ya usan todos los componentes de página revisados en esta
    // conversación: limpiar manualmente en ngOnDestroy(). Si este test
    // llegara a fallar, sería una señal de que ese patrón manual ya no es
    // necesario — no que algo se rompió.
    await router.navigateByUrl('/modulo/detalle/123');
    breadcrumbService.setDynamicBreadcrumb('Contexto anterior');

    await router.navigateByUrl('/sin-breadcrumb');

    const trail = breadcrumbService.breadcrumbs();
    expect(trail.some(item => item.label === 'Contexto anterior')).toBe(true);
  });
});
