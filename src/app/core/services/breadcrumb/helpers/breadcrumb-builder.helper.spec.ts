import { ActivatedRouteSnapshot } from '@angular/router';
import { buildBreadcrumbTrail } from './breadcrumb-builder.helper';

describe('buildBreadcrumbTrail', () => {
  it('debería retornar un array vacío si la ruta enviada es null', () => {
    expect(buildBreadcrumbTrail(null)).toEqual([]);
  });

  it('debería construir la jerarquía de breadcrumbs acumulando la URL correctamente', () => {
    // Simulamos un árbol de ActivatedRouteSnapshot
    const mockSnapshot = {
      url: [{ path: 'dashboard' }],
      data: { breadcrumb: 'Panel Principal' },
      firstChild: {
        url: [{ path: 'usuarios' }],
        data: { breadcrumb: 'Lista de Usuarios' },
        firstChild: {
          url: [{ path: '123' }],
          data: { breadcrumb: 'Detalle Usuario' },
          firstChild: null
        }
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = buildBreadcrumbTrail(mockSnapshot);

    expect(result).toEqual([
      { label: 'Panel Principal', url: '/dashboard' },
      { label: 'Lista de Usuarios', url: '/dashboard/usuarios' },
      { label: 'Detalle Usuario', url: '/dashboard/usuarios/123' }
    ]);
  });

  it('debería omitir nodos del árbol que no tengan la propiedad breadcrumb en data', () => {
    const mockSnapshot = {
      url: [{ path: 'admin' }],
      data: {}, // Sin data.breadcrumb
      firstChild: {
        url: [{ path: 'configuracion' }],
        data: { breadcrumb: 'Configuración' },
        firstChild: null
      }
    } as unknown as ActivatedRouteSnapshot;

    const result = buildBreadcrumbTrail(mockSnapshot);

    // Debe omitir 'admin' del array resultado, pero mantener la URL acumulada
    expect(result).toEqual([
      { label: 'Configuración', url: '/admin/configuracion' }
    ]);
  });
});
