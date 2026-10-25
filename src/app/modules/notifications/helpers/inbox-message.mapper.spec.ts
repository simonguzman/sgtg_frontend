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
    // Solicitud de sustentación y paz y salvo, a los documentos cargados del trabajo de grado
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'SUSTENTACION_SOLICITADA'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=ENTREGA_FINAL');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'PAZ_Y_SALVO_NO_APROBADO'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=ENTREGA_FINAL');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'PAZ_Y_SALVO_APROBADO'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=PAZ_Y_SALVO');
  });

  it('los hechos de la sustentación llevan a su pestaña, al detalle de la sesión o a los documentos corregidos', () => {
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'SUSTENTACION_PROGRAMADA'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=SUSTENTACION');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'NUEVA_FECHA_RESUELTA'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=SOLICITUDES');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'SUSTENTACION_CALIFICADA', 2))
      .toBe('/thesis-work/details/15/view_sustentation_details/sesion-2');
    expect(rutaDeNotificacion(15, 'APLAZADO', 'INASISTENCIA_REGISTRADA', 1))
      .toBe('/thesis-work/details/15/view_sustentation_details/sesion-1');
    // Sin sesión (notificaciones anteriores a ese dato), la pestaña de sustentación
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'SUSTENTACION_CALIFICADA'))
      .toBe('/thesis-work/details/15/loaded_documents?tab=SUSTENTACION');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'AJUSTES_RADICADOS')).toBe('/thesis-work/details/15/corrected_documents');
    expect(rutaDeNotificacion(15, 'SUSTENTACION', 'AJUSTES_VERIFICADOS')).toBe('/thesis-work/details/15/corrected_documents');
    // Si el hecho cerró el trabajo (ej. finalizado o no aprobado), al historial
    expect(rutaDeNotificacion(15, 'NO_APROBADO', 'SUSTENTACION_CALIFICADA', 2)).toBe('/history');
    expect(rutaDeNotificacion(15, 'FINALIZADO', 'VERSION_DEFINITIVA_CARGADA')).toBe('/history');
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
