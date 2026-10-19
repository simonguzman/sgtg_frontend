import { DestroyRef, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, fromEvent, merge } from 'rxjs';
import { TrabajoGradoStoreService } from './trabajo-grado-store.service';

/**
 * Mantiene al día los trabajos en memoria sin consultas periódicas: al
 * cambiar de página y al volver a la pestaña del navegador, el almacén
 * recarga la lista en segundo plano si superó su vigencia
 * ({@link TrabajoGradoStoreService.refrescarSiVencida}). Las páginas se
 * muestran de inmediato con lo que hay en memoria y se actualizan solas al
 * llegar los datos.
 *
 * Se registra al arrancar la aplicación (`provideAppInitializer`).
 */
export function iniciarRefrescoDeTrabajos(): void {
  const store = inject(TrabajoGradoStoreService);
  const documento = inject(DOCUMENT);
  const navegacion = inject(Router).events.pipe(filter(evento => evento instanceof NavigationEnd));
  const pestanaVisible = fromEvent(documento, 'visibilitychange')
    .pipe(filter(() => documento.visibilityState === 'visible'));
  merge(navegacion, pestanaVisible)
    .pipe(takeUntilDestroyed(inject(DestroyRef)))
    .subscribe(() => store.refrescarSiVencida());
}
