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

  it('con página anterior vuelve a ella', () => {
    navegar('/notifications');
    navegar('/thesis-work/details/1/loaded_documents');
    const respaldo = jest.fn();
    servicio.back(respaldo);
    expect(location.back).toHaveBeenCalled();
    expect(respaldo).not.toHaveBeenCalled();
  });

  it('el regreso del navegador saca la página actual; la misma URL no se repite', () => {
    navegar('/notifications');
    navegar('/notifications');
    expect(servicio.hayAnterior()).toBe(false);
    navegar('/proposal');
    navegar('/notifications', 'popstate');
    expect(servicio.hayAnterior()).toBe(false);
  });

  it('una navegación que reemplaza la página no agrega una anterior', () => {
    navegar('/proposal');
    navegar('/proposal/details/1', 'imperative', true);
    expect(servicio.hayAnterior()).toBe(false);
  });

  it('las páginas de inicio de sesión no cuentan como anteriores', () => {
    navegar('/auth/login');
    navegar('/notifications');
    expect(servicio.hayAnterior()).toBe(false);
  });
});
