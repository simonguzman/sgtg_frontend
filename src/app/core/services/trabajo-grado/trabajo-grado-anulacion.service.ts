import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { TrabajoGradoApiService } from './trabajo-grado-api.service';
import { TrabajoGradoStoreService } from './trabajo-grado-store.service';
import { TrabajoGradoResponse } from '../../interfaces/api/trabajo-grado-api.interface';

/**
 * Anulación del trabajo de grado por el director (borrado lógico): el
 * backend lo cierra como cancelado y queda en el historial. Solo en propuesta
 * o anteproyecto; después se solicita la cancelación al Consejo.
 */
@Injectable({ providedIn: 'root' })
export class TrabajoGradoAnulacionService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);

  anular(id: string, justificacion: string): Observable<TrabajoGradoResponse> {
    return this.api.enviarJson(id, 'anulacion', { justificacion: justificacion.trim() })
      .pipe(tap(trabajo => this.store.upsert(trabajo)));
  }
}
