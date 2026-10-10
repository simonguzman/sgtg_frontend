import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ProcesoApi, TrabajoGradoResponse } from '../../interfaces/api/trabajo-grado-api.interface';

/** Archivos de una operación multipart: nombre de la parte → archivo (los vacíos no se envían). */
export type PartesArchivo = Record<string, File | Blob | null | undefined>;

/**
 * Llamadas al backend de trabajos de grado (`/trabajos-grado`). Todas las
 * operaciones devuelven el trabajo completo actualizado, que el almacén
 * (`TrabajoGradoStoreService`) reemplaza en su lista.
 *
 * Las operaciones con documentos son `multipart/form-data`: el PDF en la
 * parte `archivo` (o las que indique el endpoint) y, si hay más datos, un
 * JSON en la parte `datos`.
 */
@Injectable({ providedIn: 'root' })
export class TrabajoGradoApiService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/trabajos-grado`;

  // ── Consultas ──────────────────────────────────────────────────────────────

  /** Trabajos en los que participa el usuario autenticado. */
  misTrabajos(): Observable<TrabajoGradoResponse[]> {
    return this.http.get<TrabajoGradoResponse[]>(`${this.apiUrl}/mis-trabajos`);
  }

  /** Todos los trabajos (solo Comité, Jefe de departamento, Consejo y Administrador). */
  todos(): Observable<TrabajoGradoResponse[]> {
    return this.http.get<TrabajoGradoResponse[]>(this.apiUrl);
  }

  /** Trabajos en una etapa (mismos roles que `todos`). */
  porEtapa(etapa: ProcesoApi): Observable<TrabajoGradoResponse[]> {
    return this.http.get<TrabajoGradoResponse[]>(this.apiUrl, { params: { etapa } });
  }

  consultar(id: number | string): Observable<TrabajoGradoResponse> {
    return this.http.get<TrabajoGradoResponse>(`${this.apiUrl}/${id}`);
  }

  /** URL para descargar un archivo del trabajo (con `FileDownloadService`, que envía el token). */
  urlArchivo(id: number | string, ruta: string): string {
    return `${this.apiUrl}/${id}/archivos?ruta=${encodeURIComponent(ruta)}`;
  }

  // ── Operaciones ────────────────────────────────────────────────────────────

  /** Operación sin archivos: `POST /trabajos-grado{/id}/{operacion}` con cuerpo JSON. */
  enviarJson(id: number | string | null, operacion: string, cuerpo: unknown): Observable<TrabajoGradoResponse> {
    return this.http.post<TrabajoGradoResponse>(this.urlOperacion(id, operacion), cuerpo);
  }

  /**
   * Operación con archivos: `POST /trabajos-grado{/id}/{operacion}` multipart.
   * `datos` (si no es null) va como JSON en la parte `datos`.
   */
  enviarArchivos(id: number | string | null, operacion: string, datos: unknown | null,
    archivos: PartesArchivo): Observable<TrabajoGradoResponse> {
    const formulario = new FormData();
    if (datos !== null && datos !== undefined) {
      formulario.append('datos', new Blob([JSON.stringify(datos)], { type: 'application/json' }));
    }
    Object.entries(archivos).forEach(([parte, archivo]) => {
      if (archivo) formulario.append(parte, archivo, archivo instanceof File ? archivo.name : `${parte}.pdf`);
    });
    return this.http.post<TrabajoGradoResponse>(this.urlOperacion(id, operacion), formulario);
  }

  private urlOperacion(id: number | string | null, operacion: string): string {
    return id === null ? `${this.apiUrl}/${operacion}` : `${this.apiUrl}/${id}/${operacion}`;
  }
}
