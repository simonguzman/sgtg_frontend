import { TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { NavigationHistoryService } from './navigation-history.service';

describe('NavigationHistoryService', () => {
  let eventos: Subject<unknown>;
  let reemplazar: boolean;
  let location: { back: jest.Mock };
  let servicio: NavigationHistoryService;
  let id = 0;

  /** Simula una navegación completa a la URL */
  const navegar = (url: string, trigger: 'imperative' | 'popstate' = 'imperative', replaceUrl = false) => {
    reemplazar = replaceUrl;
    eventos.next(new NavigationStart(++id, url, trigger));
    eventos.next(new NavigationEnd(id, url, url));
  };

  beforeEach(() => {
    eventos = new Subject();
    reemplazar = false;
    location = { back: jest.fn() };
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { events: eventos, getCurrentNavigation: () => ({ extras: { replaceUrl: reemplazar } }) } },
        { provide: Location, useValue: location }
      ]
    });
    servicio = TestBed.inject(NavigationHistoryService);
  });

  it('sin página anterior usa la navegación de respaldo', () => {
    navegar('/thesis-work/details/1/loaded_documents');
    const respaldo = jest.fn();
    servicio.back(respaldo);
    expect(respaldo).toHaveBeenCalled();
    expect(location.back).not.toHaveBeenCalled();
  });

  it('con página anterior del flujo vuelve a ella', () => {
    navegar('/thesis-work/details/1');
    navegar('/thesis-work/details/1/loaded_documents');
    const respaldo = jest.fn();
    servicio.back(respaldo);
    expect(location.back).toHaveBeenCalled();
    expect(respaldo).not.toHaveBeenCalled();
  });

  it('desde una notificación sigue el flujo de la sección y no vuelve a la bandeja ni a la página que dejó', () => {
    navegar('/notifications');
    navegar('/thesis-work/details/1/loaded_documents?tab=AVANCES');

    // Regresar: la vista anterior del flujo (detalle del trabajo), no la bandeja
    servicio.back(() => navegar('/thesis-work/details/1'));
    expect(location.back).not.toHaveBeenCalled();

    // Desde el detalle, regresar sigue el flujo (la sección), no vuelve a documentos cargados
    const alListado = jest.fn(() => navegar('/thesis-work'));
    servicio.back(alListado);
    expect(alListado).toHaveBeenCalled();
    expect(location.back).not.toHaveBeenCalled();

    // Dentro del flujo, regresar vuelve a la página anterior
    navegar('/thesis-work/details/1');
    servicio.back(jest.fn());
    expect(location.back).toHaveBeenCalled();
  });

  it('el regreso del navegador saca la página actual; si no coincide con la anterior, empieza de nuevo', () => {
    navegar('/proposal');
    navegar('/proposal');
    expect(servicio.hayAnterior()).toBe(false);
    navegar('/proposal/details/1');
    expect(servicio.hayAnterior()).toBe(true);
    navegar('/proposal', 'popstate');
    expect(servicio.hayAnterior()).toBe(false);
    navegar('/proposal/details/1');
    navegar('/proposal/details/1/evaluations_performed');
    navegar('/thesis-work', 'popstate');
    expect(servicio.hayAnterior()).toBe(false);
  });

  it('una navegación que reemplaza la página no agrega una anterior', () => {
    navegar('/proposal');
    navegar('/proposal/details/1', 'imperative', true);
    expect(servicio.hayAnterior()).toBe(false);
  });

  it('las páginas de inicio de sesión no cuentan como anteriores', () => {
    navegar('/auth/login');
    navegar('/proposal');
    expect(servicio.hayAnterior()).toBe(false);
  });
});
