import { Routes } from '@angular/router';

/** Ruta raíz: carga de forma diferida las rutas de los diseños (`core/layouts.routes.ts`). */
export const routes: Routes = [
  {
    path:'',
    loadChildren: () => import('./core/layouts.routes')
      .then(m => m.layoutsRoutes)
  },
]
