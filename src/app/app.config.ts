import { ApplicationConfig, inject, provideAppInitializer, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import { definePreset } from '@primeuix/themes';
import Aura from '@primeuix/themes/aura';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { AuthService } from './core/services/auth/auth.service';
import { iniciarRefrescoDeTrabajos } from './core/services/trabajo-grado/trabajo-grado-refresco';
import { NavigationHistoryService } from './core/services/navigation/navigation-history.service';

/**
 * Tema Aura de PrimeNG con el azul institucional de la Universidad del Cauca como color primario,
 * para que todos los componentes de PrimeNG lo usen sin estilos adicionales.
 */
const InstitucionalPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '{indigo.50}',
      100: '{indigo.100}',
      200: '{indigo.200}',
      300: '{indigo.300}',
      400: '{indigo.400}',
      500: '#000066',
      600: '#828AE3',
      700: '#5056AC',
      800: '#000033',
      900: '#000022',
      950: '#000011'
    }
  }
});

/**
 * Configuración de la aplicación: cliente HTTP con el interceptor de autenticación, inicializadores
 * (recuperación de la sesión, refresco de los trabajos de grado e historial de navegación), detección
 * de cambios sin zone.js, rutas y PrimeNG con el tema institucional y los textos en español.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAppInitializer(() => inject(AuthService).initialize()),
    provideAppInitializer(() => iniciarRefrescoDeTrabajos()),
    provideAppInitializer(() => { inject(NavigationHistoryService); }),
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
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
        emptyFilterMessage: 'No se encontraron resultados',
        firstDayOfWeek: 1,
        dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
        dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
        dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
        monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
          'octubre', 'noviembre', 'diciembre'],
        monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
        today: 'Hoy',
        weekHeader: 'Sem',
        dateFormat: 'dd/mm/yy'
      }
    })
  ]
};
