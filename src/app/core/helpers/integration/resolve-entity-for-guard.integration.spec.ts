import { TestBed, fakeAsync, tick, flushMicrotasks } from '@angular/core/testing';
import { Injector, signal, WritableSignal, ApplicationRef } from '@angular/core';

if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (val: unknown) => JSON.parse(JSON.stringify(val));
}

import { resolveEntityForGuard } from '../resolve-entity-for-guard.helper';

describe('Integración [Core]: Barrera Asíncrona de Hidratación en Guards', () => {
  let injector: Injector;
  let isHydratedSignal: WritableSignal<boolean>;
  let dbMock: any[];
  let appRef: ApplicationRef;

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    TestBed.configureTestingModule({});
    injector = TestBed.inject(Injector);
    appRef = TestBed.inject(ApplicationRef);

    isHydratedSignal = signal(false);
    dbMock = [];
  });

  it('debe pausar la ejecución de la ruta hasta que IndexedDB (isHydrated) termine de cargar', fakeAsync(() => {
    dbMock = [{ id: 'documento-secreto-123', autor: 'Simón' }];
    let resolvedEntity: any = undefined;
    let hasResolved = false;

    resolveEntityForGuard(
      isHydratedSignal,
      () => dbMock,
      (item: any) => item.id === 'documento-secreto-123',
      injector
    ).then(result => {
      resolvedEntity = result;
      hasResolved = true;
    });
    tick(5000);
    expect(hasResolved).toBe(false);
    expect(resolvedEntity).toBeUndefined();
    isHydratedSignal.set(true);
    appRef.tick();
    flushMicrotasks();
    expect(hasResolved).toBe(true);
    expect(resolvedEntity.autor).toBe('Simón');
  }));

  it('debe resolver instantáneamente si el storage ya estaba hidratado desde antes', fakeAsync(() => {
    dbMock = [{ id: 'doc-publico', autor: 'Admin' }];
    isHydratedSignal.set(true);
    let hasResolved = false;

    resolveEntityForGuard(
      isHydratedSignal,
      () => dbMock,
      (item: any) => item.id === 'doc-publico',
      injector
    ).then(() => {
      hasResolved = true;
    });
    appRef.tick();
    flushMicrotasks();
    expect(hasResolved).toBe(true);
  }));
});
