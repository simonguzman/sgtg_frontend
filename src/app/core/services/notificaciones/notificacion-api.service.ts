import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NotificacionApi } from '../../interfaces/api/notificacion-api.interface';

/** Buzón de notificaciones del usuario autenticado (`/notificaciones`). */
@Injectable({ providedIn: 'root' })
export class NotificacionApiService {
  private readonly http = inject(HttpClient);
  /** URL base del buzón en el backend. */
  readonly apiUrl = `${environment.apiUrl}/notificaciones`;

  /** Notificaciones del usuario, de la más reciente a la más antigua. */
  listar(): Observable<NotificacionApi[]> {
    return this.http.get<NotificacionApi[]>(this.apiUrl);
  }

  /** Marca una notificación como leída. */
  marcarLeida(id: number | string): Observable<NotificacionApi> {
    return this.http.patch<NotificacionApi>(`${this.apiUrl}/${id}/leida`, null);
  }

  /** Elimina una notificación del buzón. */
  eliminar(id: number | string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /** Vacía el buzón del usuario. */
  eliminarTodas(): Observable<void> {
    return this.http.delete<void>(this.apiUrl);
  }
}
