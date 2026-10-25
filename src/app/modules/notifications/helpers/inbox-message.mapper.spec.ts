import { aMensajeDelBuzon, rutaDeNotificacion } from './inbox-message.mapper';
import { NotificationType } from '../../../shared/components/notifications/models/notification.model';

describe('inbox-message.mapper', () => {
  it('la notificación lleva a la vista de la etapa del trabajo al notificar', () => {
    expect(rutaDeNotificacion(15, 'PROPUESTA')).toBe('/proposal/details/15');
    expect(rutaDeNotificacion(15, 'ANTEPROYECTO')).toBe('/preliminary-draft/details/15');
    expect(rutaDeNotificacion(15, 'EVALUACION')).toBe('/preliminary-draft/details/15');
    expect(rutaDeNotificacion(15, 'APROBACION_CONSEJO')).toBe('/preliminary-draft/details/15');
    expect(rutaDeNotificacion(15, 'EN_CURSO')).toBe('/thesis-work/details/15');
    expect(rutaDeNotificacion(15, 'SUSTENTACION')).toBe('/thesis-work/details/15');
    // Un trabajo cerrado está en el historial
    expect(rutaDeNotificacion(15, 'CANCELADO')).toBe('/history');
    expect(rutaDeNotificacion(15, 'FINALIZADO')).toBe('/history');
    expect(rutaDeNotificacion(null, null)).toBeUndefined();
  });

  it('el concepto del Comité lleva a las evaluaciones de la propuesta aunque el trabajo haya avanzado', () => {
    expect(rutaDeNotificacion(15, 'ANTEPROYECTO', 'DECISION_COMITE')).toBe('/proposal/details/15/evaluations_performed');
    expect(rutaDeNotificacion(15, 'PROPUESTA', 'DECISION_COMITE')).toBe('/proposal/details/15/evaluations_performed');
    // Los demás eventos (o las notificaciones sin evento) siguen la etapa
    expect(rutaDeNotificacion(15, 'ANTEPROYECTO', 'ANTEPROYECTO_RADICADO')).toBe('/preliminary-draft/details/15');
    expect(rutaDeNotificacion(15, 'ANTEPROYECTO', null)).toBe('/preliminary-draft/details/15');
    // Conceptos y decisiones del anteproyecto, a sus evaluaciones; la remisión, a las presentaciones
    expect(rutaDeNotificacion(15, 'EVALUACION', 'CONCEPTO_EVALUADOR')).toBe('/preliminary-draft/details/15/evaluations_performed');
    expect(rutaDeNotificacion(15, 'EN_CURSO', 'DECISION_CONSEJO_ANTEPROYECTO'))
      .toBe('/preliminary-draft/details/15/evaluations_performed');
    expect(rutaDeNotificacion(15, 'APROBACION_CONSEJO', 'ANTEPROYECTO_REMITIDO'))
      .toBe('/preliminary-draft/details/15/loaded_documents?tab=PRESENTACIONES');
    expect(aMensajeDelBuzon({
      id: 1, tipo: 'CONFIRMACION', titulo: 'Concepto del Comité de Programa', mensaje: 'M', trabajoId: 15,
      etapa: 'ANTEPROYECTO', evento: 'DECISION_COMITE', fecha: '2026-03-02T10:30:00', leida: false
    }, '10').actionUrl).toBe('/proposal/details/15/evaluations_performed');
  });

  it('convierte el tipo, la fecha y el estado de lectura', () => {
    const tipos = (['INFO', 'CONFIRMACION', 'ALERTA', 'ERROR'] as const).map(tipo => aMensajeDelBuzon({
      id: 1, tipo, titulo: 'T', mensaje: 'M', trabajoId: 15, etapa: 'EN_CURSO', fecha: '2026-03-02T10:30:00',
      leida: tipo === 'ERROR'
    }, '10'));

    expect(tipos.map(m => m.type)).toEqual([NotificationType.INFO, NotificationType.CONFIRMATION,
      NotificationType.SECURITY, NotificationType.ERROR]);
    expect(tipos.map(m => m.status)).toEqual(['no leido', 'no leido', 'no leido', 'leido']);
    expect(tipos[0]).toEqual(expect.objectContaining({ id: '1', userId: '10', title: 'T', message: 'M',
      date: new Date(2026, 2, 2, 10, 30), actionUrl: '/thesis-work/details/15' }));
  });
});
