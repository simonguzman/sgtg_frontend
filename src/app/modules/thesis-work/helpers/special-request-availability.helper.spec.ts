import { availableRequestTypes } from './special-request-availability.helper';
import { SpecialRequestType } from '../enums/special-request-type.enum';
import { thesisWorkDePrueba } from '../../../testing/vista-de-prueba';
import { crearTrabajoEnCurso, crearTrabajoEnCursoCon } from '../../../testing/trabajo-grado-de-prueba';
import { DecisionApi, SuspensionApi } from '../../../core/interfaces/api/trabajo-grado-api.interface';

const aprobado: DecisionApi = { organo: 'CONSEJO_FACULTAD', resultado: 'APROBADO', acta: null,
  rutaArchivo: '15/RESOLUCION/v2/r.pdf', observaciones: null, fecha: '2026-05-10' };

const suspension = (decision: DecisionApi | null): SuspensionApi => ({
  rutaSolicitud: '15/SOLICITUD_SUSPENSION/v1/s.pdf', fechaSolicitud: '2026-05-01', decision, fechaInicio: null,
  etapaPrevia: null, diasRestantes: null, fechaMaximaReanudacion: null, fechaReanudacion: null, rutaReanudacion: null,
  reanudacionAutomatica: false
});

describe('availableRequestTypes', () => {
  it('en curso y sin solicitudes: cambio de objetivos, prórroga, suspensión y cancelación', () => {
    expect(availableRequestTypes(thesisWorkDePrueba())).toEqual([
      SpecialRequestType.CAMBIO_TITULO, SpecialRequestType.PRORROGA, SpecialRequestType.SUSPENSION,
      SpecialRequestType.CANCELACION
    ]);
  });

  it('nunca ofrece la nueva fecha de sustentación (fase 6)', () => {
    expect(availableRequestTypes(thesisWorkDePrueba())).not.toContain(SpecialRequestType.NUEVA_SUSTENTACION);
  });

  it('en prórroga: solo suspensión y cancelación', () => {
    expect(availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'PRORROGA' })))).toEqual([
      SpecialRequestType.SUSPENSION, SpecialRequestType.CANCELACION
    ]);
  });

  it('suspendido: reanudación y cancelación', () => {
    expect(availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })))).toEqual([
      SpecialRequestType.REANUDACION, SpecialRequestType.CANCELACION
    ]);
  });

  it('la prórroga se solicita una sola vez (aunque esté pendiente o negada)', () => {
    const tipos = availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCursoCon({
      prorroga: { meses: 1, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/p.pdf', fechaSolicitud: '2026-11-01',
        decision: { ...aprobado, resultado: 'NO_APROBADO' } }
    })));
    expect(tipos).not.toContain(SpecialRequestType.PRORROGA);
  });

  it('el cambio de objetivos no se ofrece con uno pendiente ni después de aprobado', () => {
    const cambio = { tituloAnterior: 'A', objetivosAnteriores: [], tituloPropuesto: 'B', objetivosPropuestos: ['G'],
      justificacion: 'J', fechaSolicitud: '2026-05-01' };
    const pendiente = thesisWorkDePrueba(crearTrabajoEnCursoCon({ cambiosObjetivos: [{ ...cambio, decision: null }] }));
    const aprobadoAntes = thesisWorkDePrueba(crearTrabajoEnCursoCon({ cambiosObjetivos: [{ ...cambio, decision: aprobado }] }));
    const negado = thesisWorkDePrueba(crearTrabajoEnCursoCon({
      cambiosObjetivos: [{ ...cambio, decision: { ...aprobado, resultado: 'NO_APROBADO' } }]
    }));
    expect(availableRequestTypes(pendiente)).not.toContain(SpecialRequestType.CAMBIO_TITULO);
    expect(availableRequestTypes(aprobadoAntes)).not.toContain(SpecialRequestType.CAMBIO_TITULO);
    expect(availableRequestTypes(negado)).toContain(SpecialRequestType.CAMBIO_TITULO);
  });

  it('la suspensión no se ofrece con una pendiente ni después de aprobada', () => {
    expect(availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCursoCon({ suspensiones: [suspension(null)] }))))
      .not.toContain(SpecialRequestType.SUSPENSION);
    expect(availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCursoCon({ suspensiones: [suspension(aprobado)] }))))
      .not.toContain(SpecialRequestType.SUSPENSION);
  });

  it('la cancelación no se ofrece con una pendiente', () => {
    const conCancelacion = crearTrabajoEnCurso({
      cancelaciones: [{ rutaSolicitud: '15/SOLICITUD_CANCELACION/v1/c.pdf', fechaSolicitud: '2026-05-01',
        etapaAlSolicitar: 'EN_CURSO', decision: null }]
    });
    expect(availableRequestTypes(thesisWorkDePrueba(conCancelacion))).not.toContain(SpecialRequestType.CANCELACION);
  });

  it('un trabajo cerrado no admite solicitudes', () => {
    expect(availableRequestTypes(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'CANCELADO' })))).toEqual([]);
  });
});
