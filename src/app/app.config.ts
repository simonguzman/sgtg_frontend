import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { provideHttpClient } from '@angular/common/http';

import { routes } from './app.routes';

// Preset personalizado basado en Aura con el color institucional
// de la Universidad del Cauca como color primario.
// Al definirlo aquí, TODOS los componentes internos de PrimeNG
// (incluyendo los botones del overlay de p-columnFilter) heredan
// el color correcto sin necesidad de overrides CSS adicionales.
const InstitucionalPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '#828AE3',   // --color-primary-hover
      400: '#5056AC',   // --color-primary-active
      500: '#000066',   // --color-primary (azul institucional)
      600: '#00004d',
      700: '#000040',
      800: '#000033',
      900: '#000022',
      950: '#000011'
    }
  }
});

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: InstitucionalPreset,
        options: { darkModeSelector: false }
      },
      translation: {
        apply: 'Aplicar',
        clear: 'Limpiar',
        matchAll: 'Coincidir todo',
        matchAny: 'Coincidir cualquiera',
        addRule: 'Agregar regla',
        removeRule: 'Eliminar regla',
        accept: 'Sí',
        reject: 'No',
        choose: 'Elegir',
        upload: 'Subir',
        cancel: 'Cancelar',
        contains: 'Contiene',
        startsWith: 'Comienza con',
        endsWith: 'Termina con',
        equals: 'Igual a',
        notEquals: 'Diferente a',
        noFilter: 'Sin filtro',
        emptyMessage: 'No hay datos registrados en el sistema',
        emptyFilterMessage: 'No se encontraron resultados'
      }
    })
  ]
};
