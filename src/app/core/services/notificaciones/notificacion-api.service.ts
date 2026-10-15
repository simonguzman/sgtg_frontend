import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotificacionApi } from '../../interfaces/api/notificacion-api.interface';

/** Buzón de notificaciones del usuario autenticado (`/notificaciones`). */
@Injectable({ providedIn: 'root' })
export class NotificacionApiService {
  private readonly http = inject(HttpClient);
  readonly apiUrl = `${environment.apiUrl}/notificaciones`;

  /** Notificaciones del usuario, de la más reciente a la más antigua. */
  listar(): Observable<NotificacionApi[]> {
    return this.http.get<NotificacionApi[]>(this.apiUrl);
  }

  marcarLeida(id: number | string): Observable<NotificacionApi> {
    return this.http.patch<NotificacionApi>(`${this.apiUrl}/${id}/leida`, null);
  }

  marcarTodasLeidas(): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/leidas`, null);
  }

  eliminar(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  eliminarTodas(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
