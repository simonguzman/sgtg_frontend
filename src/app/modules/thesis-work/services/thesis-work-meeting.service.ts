import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { aTrabajoDeGrado } from '../../../core/mappers/trabajo-grado.mapper';
import { ThesisWork } from '../interfaces/thesis-work.interface';
import { fechaHoraLocal } from '../pages/register-sustentation-page/services/register-sustentation-facade.service';

/**
 * Reuniones de seguimiento del plazo de ejecución contra el backend. El
 * calendario (una reunión por mes) lo calcula el backend; el director agenda
 * cada reunión y registra que se realizó.
 */
@Injectable({ providedIn: 'root' })
export class ThesisWorkMeetingService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /**
   * Agenda (o reprograma) la reunión de un mes del plazo.
   *
   * @param number mes del plazo, desde 1
   * @param place  salón o enlace de la reunión
   */
  scheduleMeeting(thesisWorkId: string, number: number, dateTime: Date, place: string): Observable<ThesisWork> {
    return this.api.actualizar(thesisWorkId, `reuniones/${number}`,
      { fechaHora: fechaHoraLocal(dateTime), lugar: place.trim() }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /** Registra que se realizó la reunión agendada, con observaciones opcionales. */
  registerMeetingHeld(thesisWorkId: string, number: number, observations: string): Observable<ThesisWork> {
    return this.api.actualizar(thesisWorkId, `reuniones/${number}/realizada`,
      { observaciones: observations.trim() || null }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  private vista(trabajo: TrabajoGradoResponse): ThesisWork {
    const thesisWork = aTrabajoDeGrado(trabajo, this.vistas.contexto());
    if (!thesisWork) throw new Error('El trabajo de grado no está en curso.');
    return thesisWork;
  }
}
