import { Injector, Signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, take } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

/**
 * Espera a que el almacén termine su primera carga y busca en él la entidad que pide un guard, para no
 * decidir con la lista todavía vacía al abrir la aplicación desde una URL.
 * @param isHydrated señal que pasa a true cuando el almacén terminó de cargar
 * @param getAll lista actual de entidades del almacén
 * @param predicate condición que identifica la entidad buscada
 * @param injector inyector del guard, necesario para observar la señal fuera de un contexto de inyección
 * @returns la entidad encontrada, o undefined si no existe
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
