import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CatalogoResponse } from '../../interfaces/api/auth-api.interface';
import { CatalogItem } from '../../../modules/users/interfaces/catalog-item.interface';

/**
 * Catálogos del backend: departamentos (perfil docente) y programas
 * académicos (perfil de estudiante). Cualquier usuario autenticado los
 * consulta; solo el administrador los crea.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogos`;

  getDepartments(): Observable<CatalogItem[]> {
    return this.http.get<CatalogoResponse[]>(`${this.apiUrl}/departamentos`).pipe(map(lista => lista.map(aItem)));
  }

  getPrograms(): Observable<CatalogItem[]> {
    return this.http.get<CatalogoResponse[]>(`${this.apiUrl}/programas`).pipe(map(lista => lista.map(aItem)));
  }

  createDepartment(name: string): Observable<CatalogItem> {
    return this.http.post<CatalogoResponse>(`${this.apiUrl}/departamentos`, { nombre: name }).pipe(map(aItem));
  }

  createProgram(name: string): Observable<CatalogItem> {
    return this.http.post<CatalogoResponse>(`${this.apiUrl}/programas`, { nombre: name }).pipe(map(aItem));
  }
}

function aItem(catalogo: CatalogoResponse): CatalogItem {
  return { id: catalogo.id, name: catalogo.nombre };
}
