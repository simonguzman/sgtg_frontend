import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { iniciarRefrescoDeTrabajos } from './trabajo-grado-refresco';
import { TrabajoGradoStoreService } from './trabajo-grado-store.service';

describe('iniciarRefrescoDeTrabajos', () => {
  let store: { refrescarSiVencida: jest.Mock };

  beforeEach(() => {
    store = { refrescarSiVencida: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'otra', children: [] }]),
        { provide: TrabajoGradoStoreService, useValue: store }
      ]
    });
    TestBed.runInInjectionContext(() => iniciarRefrescoDeTrabajos());
  });

  afterEach(() => jest.restoreAllMocks());

  it('al cambiar de página pide refrescar los trabajos vencidos', async () => {
    await TestBed.inject(Router).navigateByUrl('/otra');
    expect(store.refrescarSiVencida).toHaveBeenCalledTimes(1);
  });

  it('al volver a la pestaña pide refrescar; al ocultarla no', () => {
    const visibilidad = jest.spyOn(document, 'visibilityState', 'get');

    visibilidad.mockReturnValue('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.refrescarSiVencida).not.toHaveBeenCalled();

    visibilidad.mockReturnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(store.refrescarSiVencida).toHaveBeenCalledTimes(1);
  });
});
