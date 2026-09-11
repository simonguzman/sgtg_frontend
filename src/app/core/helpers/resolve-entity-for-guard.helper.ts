import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

/**
 * Espera a que un storage con hidratación asíncrona (IndexedDB) termine
 * de cargar antes de buscar una entidad por predicado. Generalizado para
 * los 3 storages (Proposal/PreliminaryDraft/ThesisWork) que comparten el
 * mismo patrón de hidratación desde la migración fuera de localStorage.
 */
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
