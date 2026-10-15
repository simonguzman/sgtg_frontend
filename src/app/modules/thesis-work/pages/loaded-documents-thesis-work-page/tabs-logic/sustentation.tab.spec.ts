import { SustentationTabConfig } from './sustentation.tab';
import { stateList } from '../../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { contextoDePestana } from '../../../../../testing/contexto-de-pestana';
import {
  crearTrabajoEnCurso, crearTrabajoEnSustentacion, sustentacionDePrueba
} from '../../../../../testing/trabajo-grado-de-prueba';

const programada = thesisWorkDePrueba(crearTrabajoEnSustentacion());

describe('SustentationTabConfig', () => {
  it('lista las sesiones con fecha, hora, salón y estado', () => {
    const filas = SustentationTabConfig.getTableData([], contextoDePestana(programada));
    expect(filas).toEqual([expect.objectContaining({
      id: 'sesion-1', name: 'Sesión 1 de sustentación · Sala 1', status: stateList.EN_REVISION,
      allowedActions: ['view_sustentation_details']
    })]);
    expect(filas[0].date).toContain('09:30');
  });

  it('solo el coordinador califica la sesión actual programada', () => {
    const coordinador = SustentationTabConfig.getTableData([], contextoDePestana(programada, {
      isCoordinator: true, isJuror: true
    }));
    const jurado = SustentationTabConfig.getTableData([], contextoDePestana(programada, { isJuror: true }));
    expect(coordinador[0].allowedActions).toContain('evaluate_sustentation');
    expect(jurado[0].allowedActions).toEqual(['view_sustentation_details']);
  });

  it('con una nueva fecha pendiente no se califica', () => {
    const conSolicitud = thesisWorkDePrueba(crearTrabajoEnSustentacion({
      solicitudesNuevaFecha: [{ sesion: 1, rutaSolicitud: '15/SOLICITUD_NUEVA_FECHA/v1/s.pdf', fechaSolicitud: '2026-07-10',
        fechaHoraAnterior: '2026-07-15T09:30:00', decision: null, nuevaFechaHora: null, nuevoSalon: null }]
    }));
    const filas = SustentationTabConfig.getTableData([], contextoDePestana(conSolicitud, { isCoordinator: true }));
    expect(filas[0].allowedActions).toEqual(['view_sustentation_details']);
  });

  it('la primera sesión aplazada y la segunda programada: solo la actual se califica', () => {
    const base = sustentacionDePrueba();
    const dosSesiones = thesisWorkDePrueba(crearTrabajoEnSustentacion({
      sesiones: [base.sesiones[0], { ...base.sesiones[0], numero: 2, fechaHora: '2026-08-20T10:00:00' }],
      calificaciones: [{ sesion: 1, juradoUsuarioId: 30, jurado: 'Juan', calificacion: 'APLAZADO',
        observaciones: 'Repetir', rutaActa: '15/TI-G/v1/acta.pdf', fecha: '2026-07-15' }]
    }));
    const filas = SustentationTabConfig.getTableData([], contextoDePestana(dosSesiones, { isCoordinator: true }));
    expect(filas.map(f => [f.id, f.status])).toEqual([
      ['sesion-2', stateList.EN_REVISION], ['sesion-1', stateList.APLAZADO]
    ]);
    expect(filas[0].allowedActions).toContain('evaluate_sustentation');
    expect(filas[1].allowedActions).toEqual(['view_sustentation_details']);
  });

  it('la inasistencia se muestra como no aprobada en su sesión', () => {
    const inasistencia = thesisWorkDePrueba(crearTrabajoEnSustentacion({
      estado: 'APLAZADA',
      inasistencias: [{ sesion: 1, juradoUsuarioId: 30, jurado: 'Juan', favorable: false,
        observaciones: 'No se presentó', fecha: '2026-07-15' }]
    }, { etapa: 'APLAZADO' }));
    const filas = SustentationTabConfig.getTableData([], contextoDePestana(inasistencia));
    expect(filas[0].status).toBe(stateList.APLAZADO);
  });

  describe('botón del Consejo', () => {
    const boton = (estado: Parameters<typeof sustentacionDePrueba>[0] | null) => {
      const trabajo = estado === null ? thesisWorkDePrueba(crearTrabajoEnCurso())
        : thesisWorkDePrueba(crearTrabajoEnSustentacion(estado));
      return SustentationTabConfig.getHeaderButtons(contextoDePestana(trabajo, { isConsejo: true }))[0];
    };

    it('espera la solicitud del director', () => {
      expect(boton(null)).toEqual(expect.objectContaining({ label: 'Esperando la solicitud del director', disabled: true }));
    });

    it('programa la sustentación solicitada', () => {
      expect(boton({ estado: 'SOLICITADA', sesiones: [] }))
        .toEqual(expect.objectContaining({ label: 'Programar sustentación', disabled: false }));
    });

    it('programa la segunda sesión tras un aplazamiento', () => {
      expect(boton({ estado: 'APLAZADA' })).toEqual(expect.objectContaining({ label: 'Programar segunda sesión', disabled: false }));
    });

    it('con la sesión programada no hay nada que programar', () => {
      expect(boton({ estado: 'PROGRAMADA' })).toEqual(expect.objectContaining({ label: 'Sustentación programada', disabled: true }));
    });

    it('otros roles no ven el botón', () => {
      expect(SustentationTabConfig.getHeaderButtons(contextoDePestana(programada, { isDirector: true }))).toEqual([]);
    });
  });
});
