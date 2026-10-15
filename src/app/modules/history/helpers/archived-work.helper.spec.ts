import {
  cambioDeCierre, estaArchivado, etapaDeCierre, motivoDeCierre, nombreEtapa, participoEnElTrabajo,
  puedeVerArchivado, resultadoDeCierre
} from './archived-work.helper';
import { stateList } from '../../../core/enums/state.enum';
import {
  cerrarTrabajo, crearTrabajoDePrueba, crearTrabajoEnCurso, crearTrabajoEnEvaluacion
} from '../../../testing/trabajo-grado-de-prueba';

describe('archived-work.helper', () => {
  const anulado = cerrarTrabajo(crearTrabajoDePrueba(), 'CANCELADO', 'ANULACION_DIRECTOR', '2026-04-01T08:00:00',
    'Cambio de modalidad');

  it('un trabajo está archivado cuando está en una etapa final', () => {
    expect(estaArchivado(crearTrabajoDePrueba())).toBe(false);
    expect(estaArchivado(anulado)).toBe(true);
    expect(estaArchivado(cerrarTrabajo(crearTrabajoEnCurso(), 'FINALIZADO', null))).toBe(true);
    expect(estaArchivado(cerrarTrabajo(crearTrabajoEnCurso(), 'NO_APROBADO', 'VENCIMIENTO_PLAZO'))).toBe(true);
  });

  it('participan los estudiantes, el director, el codirector y el asesor; no los evaluadores', () => {
    const trabajo = crearTrabajoEnEvaluacion({
      codirector: { ...crearTrabajoDePrueba().director, usuarioId: 2 },
      asesor: { usuarioId: 3, codigo: null, nombreCompleto: 'Asesor', email: null, organizacion: null, externo: false }
    });
    expect(['10', '1', '2', '3'].every(id => participoEnElTrabajo(trabajo, id))).toBe(true);
    // Evaluador del anteproyecto
    expect(participoEnElTrabajo(trabajo, '20')).toBe(false);
    expect(participoEnElTrabajo(trabajo, undefined)).toBe(false);
  });

  it('el acceso general ve todo lo archivado; nadie ve en el historial un trabajo activo', () => {
    expect(puedeVerArchivado(anulado, '99', true)).toBe(true);
    expect(puedeVerArchivado(anulado, '99', false)).toBe(false);
    expect(puedeVerArchivado(anulado, '10', false)).toBe(true);
    expect(puedeVerArchivado(crearTrabajoDePrueba(), '10', true)).toBe(false);
  });

  it('la etapa, el motivo, la fecha y el resultado del cierre', () => {
    expect(cambioDeCierre(anulado)).toEqual(expect.objectContaining({ fecha: '2026-04-01T08:00:00',
      observacion: 'Cambio de modalidad' }));
    expect(etapaDeCierre(anulado)).toBe('PROPUESTA');
    expect(nombreEtapa(etapaDeCierre(anulado))).toBe('Propuesta');
    expect(motivoDeCierre(anulado)).toBe('Anulado por el director');
    expect(resultadoDeCierre(anulado)).toBe(stateList.CANCELADO);

    const finalizado = cerrarTrabajo(crearTrabajoEnCurso({ etapa: 'SUSTENTACION' }), 'FINALIZADO', null);
    expect(nombreEtapa(etapaDeCierre(finalizado))).toBe('Sustentación');
    expect(motivoDeCierre(finalizado)).toBe('Trabajo de grado aprobado');
    expect(resultadoDeCierre(finalizado)).toBe(stateList.APROBADO);

    const vencido = cerrarTrabajo(crearTrabajoEnCurso(), 'NO_APROBADO', 'VENCIMIENTO_PLAZO');
    expect(motivoDeCierre(vencido)).toBe('Vencimiento de plazos');
    expect(resultadoDeCierre(vencido)).toBe(stateList.NO_APROBADO);
  });
});
