import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

/**
 * Espera a que un storage con hidratación asíncrona (IndexedDB) termine
 * de cargar. SIEMPRE con `await` en un `beforeEach` async — NUNCA dentro
 * de fakeAsync()/tick(): el reloj simulado de zone.js no controla de
 * forma fiable el temporizador real de fake-indexeddb, que es justo la
 * fuga que causó el crash de Node.
 */
export function waitForHydration(isHydrated: Signal<boolean>, injector: Injector): Promise<void> {
  if (isHydrated()) return Promise.resolve();
  return firstValueFrom(
    toObservable(isHydrated, { injector }).pipe(filter(v => v), take(1))
  ).then(() => undefined);
}
