import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

export function waitForHydration(isHydrated: Signal<boolean>, injector: Injector): Promise<void> {
  if (isHydrated()) return Promise.resolve();
  return firstValueFrom(
    toObservable(isHydrated, { injector }).pipe(filter(v => v), take(1))
  ).then(() => undefined);
}
