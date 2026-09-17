import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { Injector, signal, WritableSignal, ApplicationRef } from '@angular/core';
import { resolveEntityForGuard } from '../resolve-entity-for-guard.helper';

describe('Integración [Core]: Barrera Asíncrona de Hidratación en Guards', () => {
  let injector: Injector;
  let isHydratedSignal: WritableSignal<boolean>;
  let dbMock: any[];
  let appRef: ApplicationRef;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
    appRef = TestBed.inject(ApplicationRef);

    // Simulamos el estado inicial de IndexedDB (Aún cargando)
    isHydratedSignal = signal(false);
    dbMock = [];
  });

  it('debe pausar la ejecución de la ruta hasta que IndexedDB (isHydrated) termine de cargar', fakeAsync(() => {
    // Arrange: Sembramos un dato simulado en la BD
    dbMock = [{ id: 'documento-secreto-123', autor: 'Simón' }];
    let resolvedEntity: any = undefined;
    let hasResolved = false;

    // Act 1: El Router ejecuta el Guard, pero IndexedDB aún no carga (signal = false)
    resolveEntityForGuard(
      isHydratedSignal,
      () => dbMock,
      (item) => item.id === 'documento-secreto-123',
      injector
    ).then(result => {
      resolvedEntity = result;
      hasResolved = true;
    });

    // Avanzamos el tiempo simulado. RxJS y Angular NO deberían avanzar la promesa.
    tick(5000);

    // Assert 1: ¡El Guard está bloqueado exitosamente!
    // No deja pasar al usuario ni evalúa prematuramente la BD.
    expect(hasResolved).toBe(false);
    expect(resolvedEntity).toBeUndefined();

    // Act 2: IndexedDB termina de cargar y actualiza la señal reactiva
    isHydratedSignal.set(true);

    // Forzamos a Angular a procesar la reactividad (Signals -> RxJS toObservable -> Promesa)
    appRef.tick();
    flushMicrotasks();

    // Assert 2: La barrera se levantó y el Guard encontró el dato correcto
    expect(hasResolved).toBe(true);
    expect(resolvedEntity.autor).toBe('Simón');
  }));

  it('debe resolver instantáneamente si el storage ya estaba hidratado desde antes', fakeAsync(() => {
    // Arrange: El usuario ya llevaba rato navegando, IndexedDB ya había cargado
    dbMock = [{ id: 'doc-publico', autor: 'Admin' }];
    isHydratedSignal.set(true);

    let hasResolved = false;

    // Act
    resolveEntityForGuard(
      isHydratedSignal,
      () => dbMock,
      (item) => item.id === 'doc-publico',
      injector
    ).then(() => {
      hasResolved = true;
    });

    // Como la señal ya es true, se resuelve en el mismo ciclo de microtareas
    appRef.tick();
    flushMicrotasks();

    // Assert: Pasó directo sin bloquear
    expect(hasResolved).toBe(true);
  }));
});
