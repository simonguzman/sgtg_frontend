import {
  EjecucionApi, InformeMensualApi, RevisionInformeApi, TrabajoGradoResponse
} from '../core/interfaces/api/trabajo-grado-api.interface';

/**
 * Trabajo de grado de prueba tal como lo devuelve el backend: investigación
 * en etapa de propuesta, con la propuesta radicada y sin decisión del Comité.
 * Se ajusta con `overrides` para llevarlo a otras etapas.
 */
export function crearTrabajoDePrueba(overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  return {
    id: 15,
    modalidad: 'TRABAJO_DE_INVESTIGACION',
    titulo: 'Sistema de gestión',
    objetivos: ['Objetivo general', 'Objetivo específico'],
    descripcion: null,
    lineaInvestigacion: null,
    etapa: 'PROPUESTA',
    motivoCierre: null,
    estudiantes: [{ usuarioId: 10, codigo: '1010', nombreCompleto: 'Eva Estudiante', email: 'eva@unicauca.edu.co',
      programa: { id: 1, nombre: 'Ingeniería de Sistemas' } }],
    director: { usuarioId: 1, codigo: '1001', nombreCompleto: 'Dora Directora Pérez', email: 'dora@unicauca.edu.co',
      tipoVinculacion: 'PLANTA', departamento: { id: 1, nombre: 'Sistemas' } },
    codirector: null,
    asesor: null,
    cartaAceptacion: null,
    propuesta: {
      fechaLimiteConcepto: '2026-03-16',
      versiones: [{ tipo: 'PROPUESTA', formato: 'TI-A', ruta: '15/TI-A/v1/propuesta.pdf', version: 1,
        fechaCarga: '2026-03-02', estado: 'EN_REVISION' }],
      decisiones: []
    },
    anteproyecto: {
      fechaLimiteEvaluacion: null,
      fechaLimiteCorrecciones: null,
      versiones: [],
      evaluadores: [],
      conceptos: [],
      decisionesConsejo: [],
      remisiones: []
    },
    ejecucion: null,
    sustentacion: null,
    cancelaciones: [],
    historial: [],
    ...overrides
  };
}

/** El mismo trabajo con la propuesta aprobada por el Comité (etapa de anteproyecto). */
export function crearTrabajoEnAnteproyecto(overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  const base = crearTrabajoDePrueba();
  return crearTrabajoDePrueba({
    etapa: 'ANTEPROYECTO',
    propuesta: {
      ...base.propuesta,
      versiones: base.propuesta.versiones.map(version => ({ ...version, estado: 'APROBADO' as const })),
      decisiones: [{ organo: 'COMITE_PROGRAMA', resultado: 'APROBADO', acta: 'Acta 1',
        rutaArchivo: '15/ACTA_COMITE/v1/acta.pdf', observaciones: null, fecha: '2026-03-05' }]
    },
    historial: [{ origen: 'PROPUESTA', destino: 'ANTEPROYECTO', fecha: '2026-03-05T10:00:00', responsable: 'C1',
      observacion: null }],
    ...overrides
  });
}

/** El trabajo con la primera versión del anteproyecto radicada, en revisión y sin evaluadores. */
export function crearTrabajoConAnteproyectoRadicado(overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  const base = crearTrabajoEnAnteproyecto();
  return crearTrabajoEnAnteproyecto({
    anteproyecto: {
      ...base.anteproyecto,
      versiones: [{ tipo: 'ANTEPROYECTO', formato: null, ruta: '15/ANTEPROYECTO/v1/anteproyecto.pdf', version: 1,
        fechaCarga: '2026-03-09', estado: 'EN_REVISION' }]
    },
    ...overrides
  });
}

/** El trabajo con el anteproyecto en evaluación: evaluadores 20 y 21 asignados, sin conceptos. */
export function crearTrabajoEnEvaluacion(overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  const base = crearTrabajoConAnteproyectoRadicado();
  return crearTrabajoConAnteproyectoRadicado({
    etapa: 'EVALUACION',
    anteproyecto: {
      ...base.anteproyecto,
      fechaLimiteEvaluacion: '2026-03-23',
      evaluadores: [
        { usuarioId: 20, codigo: '1020', nombreCompleto: 'Vera Evaluadora', email: 'vera@unicauca.edu.co' },
        { usuarioId: 21, codigo: '1021', nombreCompleto: 'Walter Evaluador', email: 'walter@unicauca.edu.co' }
      ]
    },
    ...overrides
  });
}

/** El mismo trabajo aprobado por el Consejo (en curso). */
export function crearTrabajoEnCurso(overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  const base = crearTrabajoEnAnteproyecto();
  return crearTrabajoEnAnteproyecto({
    etapa: 'EN_CURSO',
    anteproyecto: {
      fechaLimiteEvaluacion: '2026-04-01',
      fechaLimiteCorrecciones: null,
      versiones: [{ tipo: 'ANTEPROYECTO', formato: null, ruta: '15/ANTEPROYECTO/v1/anteproyecto.pdf', version: 1,
        fechaCarga: '2026-03-10', estado: 'APROBADO' }],
      evaluadores: [
        { usuarioId: 20, codigo: '1020', nombreCompleto: 'Vera Evaluadora', email: 'vera@unicauca.edu.co' },
        { usuarioId: 21, codigo: '1021', nombreCompleto: 'Walter Evaluador', email: 'walter@unicauca.edu.co' }
      ],
      conceptos: [
        { version: 1, evaluadorUsuarioId: 20, evaluador: 'Vera Evaluadora', resultado: 'APROBADO', observaciones: null,
          fecha: '2026-03-12', formato: { tipo: 'EVALUACION_ANTEPROYECTO', formato: 'TI-B',
            ruta: '15/TI-B/v1/formato-b.pdf', version: 1, fechaCarga: '2026-03-12' }, anotaciones: null },
        { version: 1, evaluadorUsuarioId: 21, evaluador: 'Walter Evaluador', resultado: 'APROBADO', observaciones: null,
          fecha: '2026-03-13', formato: null, anotaciones: null }
      ],
      decisionesConsejo: [{ organo: 'CONSEJO_FACULTAD', resultado: 'APROBADO', acta: null,
        rutaArchivo: '15/RESOLUCION/v1/resolucion.pdf', observaciones: null, fecha: '2026-03-20' }],
      remisiones: [{ tipo: 'REMISION_CONSEJO', formato: 'TI-C', ruta: '15/TI-C/v1/formato-c.pdf', version: 1,
        fechaCarga: '2026-03-16' }]
    },
    ejecucion: {
      fechaNotificacion: '2026-03-20',
      fechaFin: '2026-12-20',
      fechaMinimaSustentacion: '2026-06-20',
      fechaLimiteCambioObjetivos: '2026-09-20',
      fechaLimiteSolicitudProrroga: '2026-12-05',
      cambiosObjetivos: [],
      informesMensuales: [],
      prorroga: null,
      suspensiones: []
    },
    historial: [...base.historial],
    ...overrides
  });
}

/** Informe mensual del backend (radicado por la estudiante 1010) con las revisiones indicadas. */
export function informeDePrueba(numero: number, overrides: Partial<InformeMensualApi> = {}): InformeMensualApi {
  return {
    numero,
    rutaArchivo: `15/TI-D/v${numero}/informe-${numero}.pdf`,
    fecha: `2026-0${3 + numero}-20`,
    radicadoPor: '1010',
    observaciones: null,
    revisiones: [],
    ...overrides
  };
}

/** Revisión de un informe por la directora (usuario 1). */
export function revisionDePrueba(overrides: Partial<RevisionInformeApi> = {}): RevisionInformeApi {
  return {
    revisorUsuarioId: 1,
    revisor: 'Dora Directora Pérez',
    observaciones: 'Ajustar el cronograma',
    rutaArchivo: '15/REVISION_INFORME/v1/notas.pdf',
    fecha: '2026-04-25',
    ...overrides
  };
}

/** El trabajo en curso con cambios en su ejecución (informes, prórroga, suspensiones...). */
export function crearTrabajoEnCursoCon(ejecucion: Partial<EjecucionApi>,
  overrides: Partial<TrabajoGradoResponse> = {}): TrabajoGradoResponse {
  const base = crearTrabajoEnCurso();
  return crearTrabajoEnCurso({ ejecucion: { ...base.ejecucion!, ...ejecucion }, ...overrides });
}
