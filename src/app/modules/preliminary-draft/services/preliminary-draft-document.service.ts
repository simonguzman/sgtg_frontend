import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import { stateList } from '../../../core/enums/state.enum';
import { PreliminaryDraft } from '../interfaces/preliminary-draft.interface';
import { TrabajoGradoApiService } from '../../../core/services/trabajo-grado/trabajo-grado-api.service';
import { TrabajoGradoStoreService } from '../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { aAnteproyecto } from '../../../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../../../core/interfaces/api/trabajo-grado-api.interface';
import { fechaLocalIso } from '../../../core/utils/date-utils';

/** Resultado del concepto de un evaluador en el backend (formato B). */
export type ResultadoConceptoEvaluador = 'APROBADO' | 'CON_CORRECCIONES' | 'NO_APROBADO';

/**
 * Documentos y decisiones del anteproyecto contra el backend: conceptos de los
 * evaluadores (con el formato B), versiones corregidas y la decisión del
 * Consejo de Facultad (con la resolución).
 */
@Injectable({ providedIn: 'root' })
export class PreliminaryDraftDocumentService {
  private readonly api = inject(TrabajoGradoApiService);
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);

  /**
   * Concepto de un evaluador sobre la versión en revisión. Cuando ambos
   * conceptan, la versión queda APROBADO (pasa al Consejo), NO_APROBADO (alguno
   * no la aprobó) o CON_CORRECCIONES (evaluada con observaciones).
   *
   * @param formatoB    formato B diligenciado y firmado por el evaluador (obligatorio)
   * @param anotaciones documento opcional con las anotaciones del evaluador
   */
  public registerEvaluatorConcept(preliminaryDraftId: string, resultado: ResultadoConceptoEvaluador,
    observaciones: string, formatoB: File | null, anotaciones?: File | null): Observable<PreliminaryDraft> {
    return this.api.enviarArchivos(preliminaryDraftId, 'anteproyecto/conceptos', { resultado, observaciones },
      { archivo: formatoB, anotaciones }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /** Radica la versión corregida del anteproyecto: vuelve a revisión de los mismos evaluadores. */
  public uploadCorrection(preliminaryDraftId: string, file: File): Observable<PreliminaryDraft> {
    return this.api.enviarArchivos(preliminaryDraftId, 'anteproyecto', null, { archivo: file }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /**
   * El Jefe de departamento remite al Consejo, con el formato C, la versión
   * que ambos evaluadores aprobaron (paso obligatorio antes de la decisión).
   */
  public uploadCouncilPresentation(preliminaryDraftId: string, formatoC: File): Observable<PreliminaryDraft> {
    return this.api.enviarArchivos(preliminaryDraftId, 'anteproyecto/remision', null, { archivo: formatoC }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  /**
   * Decisión del Consejo de Facultad sobre el anteproyecto aprobado por los
   * evaluadores, con la resolución. APROBADO deja el trabajo en curso desde la
   * fecha de la reunión del Consejo hasta la fecha máxima de entrega que fijó
   * (entre 3 y 9 meses); NO APROBADO lo devuelve al director para una nueva versión.
   */
  public registerCouncilDecision(preliminaryDraftId: string, veredict: stateList, observaciones: string,
    resolucion: File, startDate: Date | null = null, endDate: Date | null = null): Observable<PreliminaryDraft> {
    const aprobado = veredict === stateList.APROBADO;
    return this.api.enviarArchivos(preliminaryDraftId, 'anteproyecto/decisiones-consejo', {
      resultado: aprobado ? 'APROBADO' : 'NO_APROBADO',
      observaciones: observaciones || null,
      fechaInicio: aprobado && startDate ? fechaLocalIso(startDate) : null,
      fechaFin: aprobado && endDate ? fechaLocalIso(endDate) : null
    }, { archivo: resolucion }).pipe(
      tap(trabajo => this.store.upsert(trabajo)),
      map(trabajo => this.vista(trabajo))
    );
  }

  public calculateDocumentStatus(
    documentId: string,
    evaluations: Evaluation[],
    totalEvaluators: number
  ): stateList {
    if (totalEvaluators === 0) return stateList.EN_REVISION;

    const documentEvaluations = evaluations?.filter(e => e.documentId === documentId) ?? [];
    if (documentEvaluations.length < totalEvaluators) return stateList.EN_REVISION;
    // Misma regla del backend: alguno no aprueba → no aprobado; alguno pide correcciones → evaluado con observaciones
    if (documentEvaluations.some(evaluation => evaluation.veredict === stateList.NO_APROBADO)) return stateList.NO_APROBADO;
    if (documentEvaluations.some(evaluation => evaluation.veredict === stateList.CON_CORRECCIONES)) {
      return stateList.EVALUADO_CON_OBSERVACIONES;
    }
    return stateList.APROBADO;
  }

  private vista(trabajo: TrabajoGradoResponse): PreliminaryDraft {
    const anteproyecto = aAnteproyecto(trabajo, this.vistas.contexto());
    if (!anteproyecto) throw new Error('El trabajo de grado no tiene anteproyecto radicado.');
    return anteproyecto;
  }
}
