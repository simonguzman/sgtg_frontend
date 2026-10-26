import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { CatalogoResponse, ProgramaResponse } from '../../interfaces/api/auth-api.interface';
import { CatalogItem } from '../../../modules/users/interfaces/catalog-item.interface';

/**
 * Catálogos del backend: departamentos (perfil docente) y programas
 * académicos (perfil de estudiante). Cada programa está adscrito a un
 * departamento: el Comité de ese departamento atiende sus trabajos. Cualquier
 * usuario autenticado los consulta; solo el administrador los crea.
 */
@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/catalogos`;

  getDepartments(): Observable<CatalogItem[]> {
    return this.http.get<CatalogoResponse[]>(`${this.apiUrl}/departamentos`).pipe(map(lista => lista.map(aItem)));
  }

  /** Programas con su departamento como dato complementario (`detail`). */
  getPrograms(): Observable<CatalogItem[]> {
    return this.http.get<ProgramaResponse[]>(`${this.apiUrl}/programas`).pipe(map(lista => lista.map(aPrograma)));
  }

  createDepartment(name: string): Observable<CatalogItem> {
    return this.http.post<CatalogoResponse>(`${this.apiUrl}/departamentos`, { nombre: name }).pipe(map(aItem));
  }

  /** Crea un programa adscrito al departamento indicado. */
  createProgram(name: string, departmentId: number): Observable<CatalogItem> {
    return this.http.post<ProgramaResponse>(`${this.apiUrl}/programas`, { nombre: name, departamentoId: departmentId })
      .pipe(map(aPrograma));
  }
}

function aItem(catalogo: CatalogoResponse): CatalogItem {
  return { id: catalogo.id, name: catalogo.nombre };
}

function aPrograma(programa: ProgramaResponse): CatalogItem {
  return programa.departamento
    ? { ...aItem(programa), detail: programa.departamento.nombre, parentId: programa.departamento.id }
    : aItem(programa);
}
