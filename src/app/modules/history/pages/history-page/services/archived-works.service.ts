import { computed, inject, Injectable } from '@angular/core';
import { AuthService } from '../../../../../core/services/auth/auth.service';
import { TrabajoGradoStoreService } from '../../../../../core/services/trabajo-grado/trabajo-grado-store.service';
import { TrabajoGradoVistasService } from '../../../../../core/services/trabajo-grado/trabajo-grado-vistas.service';
import { Column, TableRow } from '../../../../../shared/components/table-component/table-component.component';
import { aFecha, veredicto } from '../../../../../core/mappers/trabajo-grado.mapper';
import { ultimoConceptoDe, yaEvaluo } from '../../../../../core/helpers/evaluacion-pendiente.helper';
import { formatDisplayDate } from '../../../../../core/utils/date-utils';
import { TrabajoGradoResponse } from '../../../../../core/interfaces/api/trabajo-grado-api.interface';
import {
  cambioDeCierre, etapaDeCierre, motivoDeCierre, nombreEtapa, puedeVerArchivado, resultadoDeCierre,
  ROLES_HISTORIAL_GENERAL
} from '../../../helpers/archived-work.helper';

/** Acciones de cada fila: la descripción y las vistas de las etapas que alcanzó el trabajo. */
export const ARCHIVED_WORK_ACTIONS = {
  DESCRIPCION: 'ver descripcion',
  PROPUESTA: 'ver-propuesta',
  ANTEPROYECTO: 'ver-anteproyecto',
  TRABAJO: 'ver-trabajo'
} as const;

/** Ruta del detalle (dentro de /history) de cada acción de vista. */
export const ARCHIVED_WORK_ROUTES: Record<string, string> = {
  [ARCHIVED_WORK_ACTIONS.PROPUESTA]: 'proposal-details',
  [ARCHIVED_WORK_ACTIONS.ANTEPROYECTO]: 'preliminary-draft-details',
  [ARCHIVED_WORK_ACTIONS.TRABAJO]: 'thesis-work-details'
};

/**
 * Historial: los trabajos de grado archivados (terminados, no aprobados,
 * cancelados o anulados), uno por trabajo. Desde cada fila se consultan las
 * etapas que alcanzó, con todos sus documentos y versiones.
 *
 * Al evaluador se le agregan los anteproyectos que ya evaluó (aunque el
 * trabajo siga activo), con su concepto y solo la consulta del anteproyecto.
 */
@Injectable({ providedIn: 'root' })
export class ArchivedWorksService {
  private readonly store = inject(TrabajoGradoStoreService);
  private readonly vistas = inject(TrabajoGradoVistasService);
  private readonly authService = inject(AuthService);

  /** Trabajos con vista de anteproyecto (propuesta aprobada) y de trabajo de grado (llegó a en curso). */
  private readonly conAnteproyecto = computed(() =>
    new Set(this.vistas.anteproyectos().map(anteproyecto => anteproyecto.preliminaryDraftId)));
  private readonly conTrabajo = computed(() => new Set(this.vistas.trabajosDeGrado().map(t => t.thesisWorkId)));

  readonly columns: Column[] = [
    { field: 'title', header: 'Título', type: 'text', width: '22%' },
    { field: 'modality', header: 'Modalidad', type: 'text', width: '10%' },
    { field: 'authors', header: 'Estudiantes', type: 'text', width: '15%' },
    {
      field: 'description', header: 'Descripción', type: 'actions', width: '8%',
      actions: [{ action: ARCHIVED_WORK_ACTIONS.DESCRIPCION, label: 'Ver', variant: 'primary', disabled: false }]
    },
    { field: 'closedAt', header: 'Etapa', type: 'text', width: '10%' },
    { field: 'state', header: 'Resultado', type: 'state', width: '9%' },
    { field: 'reason', header: 'Motivo', type: 'text', width: '12%' },
    { field: 'closingDate', header: 'Fecha', type: 'text', width: '8%' },
    {
      field: 'acciones', header: 'Consultar', type: 'actions', width: '6%',
      actions: [
        { action: ARCHIVED_WORK_ACTIONS.PROPUESTA, label: 'Propuesta', variant: 'secondary', disabled: false },
        { action: ARCHIVED_WORK_ACTIONS.ANTEPROYECTO, label: 'Anteproyecto', variant: 'secondary', disabled: false },
        { action: ARCHIVED_WORK_ACTIONS.TRABAJO, label: 'Trabajo de grado', variant: 'secondary', disabled: false }
      ]
    }
  ];

  /** true si el usuario consulta todo el historial. */
  readonly accesoGeneral = computed(() => this.authService.hasAnyRole([...ROLES_HISTORIAL_GENERAL]));

  /** Trabajos archivados visibles para el usuario, del cierre más reciente al más antiguo. */
  readonly archivados = computed<TrabajoGradoResponse[]>(() => {
    const userId = this.authService.currentUser()?.id;
    return this.store.trabajos()
      .filter(trabajo => puedeVerArchivado(trabajo, userId, this.accesoGeneral()))
      .sort((a, b) => (cambioDeCierre(b)?.fecha ?? '').localeCompare(cambioDeCierre(a)?.fecha ?? ''));
  });

  /** Anteproyectos que el usuario ya evaluó y que no están en su archivo. */
  readonly evaluados = computed<TrabajoGradoResponse[]>(() => {
    const userId = this.authService.currentUser()?.id;
    const archivados = new Set(this.archivados().map(trabajo => trabajo.id));
    return this.store.trabajos().filter(trabajo => !archivados.has(trabajo.id) && yaEvaluo(trabajo, userId));
  });

  readonly tableData = computed<TableRow[]>(() => {
    const userId = this.authService.currentUser()?.id;
    return [
      ...this.archivados().map(trabajo => this.fila(trabajo)),
      ...this.evaluados().map(trabajo => this.filaEvaluada(trabajo, userId))
    ].sort((a, b) => (b['sortDate'] as string).localeCompare(a['sortDate'] as string));
  });

  private fila(trabajo: TrabajoGradoResponse): TableRow {
    const cierre = cambioDeCierre(trabajo);
    const fecha = aFecha(cierre?.fecha);
    return {
      id: String(trabajo.id),
      title: trabajo.titulo,
      modality: trabajo.modalidad === 'PRACTICA_PROFESIONAL' ? 'Práctica profesional' : 'Investigación',
      authors: trabajo.estudiantes.map(estudiante => estudiante.nombreCompleto).join(', ') || 'Sin asignar',
      description: trabajo.descripcion || 'Sin descripción',
      closedAt: nombreEtapa(etapaDeCierre(trabajo)),
      state: resultadoDeCierre(trabajo),
      reason: motivoDeCierre(trabajo),
      justification: cierre?.observacion ?? null,
      closingDate: fecha ? formatDisplayDate(fecha) : 'Sin fecha',
      sortDate: cierre?.fecha ?? '',
      allowedActions: this.accionesDe(trabajo)
    };
  }

  /** Anteproyecto evaluado por el usuario: su último concepto y solo la consulta del anteproyecto. */
  private filaEvaluada(trabajo: TrabajoGradoResponse, userId: string | undefined): TableRow {
    const concepto = ultimoConceptoDe(trabajo, userId)!;
    const fecha = aFecha(concepto.fecha);
    return {
      id: String(trabajo.id),
      title: trabajo.titulo,
      modality: trabajo.modalidad === 'PRACTICA_PROFESIONAL' ? 'Práctica profesional' : 'Investigación',
      authors: trabajo.estudiantes.map(estudiante => estudiante.nombreCompleto).join(', ') || 'Sin asignar',
      description: trabajo.descripcion || 'Sin descripción',
      closedAt: nombreEtapa(trabajo.etapa),
      state: veredicto(concepto.resultado),
      reason: `Evaluaste la versión ${concepto.version} del anteproyecto`,
      justification: concepto.observaciones,
      closingDate: fecha ? formatDisplayDate(fecha) : 'Sin fecha',
      sortDate: concepto.fecha,
      allowedActions: [ARCHIVED_WORK_ACTIONS.DESCRIPCION, ARCHIVED_WORK_ACTIONS.ANTEPROYECTO]
    };
  }

  /** La propuesta siempre; el anteproyecto y el trabajo si el trabajo llegó a esas etapas. */
  private accionesDe(trabajo: TrabajoGradoResponse): string[] {
    const id = String(trabajo.id);
    return [
      ARCHIVED_WORK_ACTIONS.DESCRIPCION,
      ARCHIVED_WORK_ACTIONS.PROPUESTA,
      ...(this.conAnteproyecto().has(id) ? [ARCHIVED_WORK_ACTIONS.ANTEPROYECTO] : []),
      ...(this.conTrabajo().has(id) ? [ARCHIVED_WORK_ACTIONS.TRABAJO] : [])
    ];
  }
}
