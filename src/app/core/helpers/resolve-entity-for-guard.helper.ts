import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

export function resolveEntityForGuard<T>(
  isHydrated: Signal<boolean>,
  getAll: () => T[],
  predicate: (entity: T) => boolean,
  injector: Injector
): Promise<T | undefined> {
  return firstValueFrom(
    toObservable(isHydrated, { injector }).pipe(
      filter(hydrated => hydrated),
      take(1)
    )
  ).then(() => getAll().find(predicate));
}
