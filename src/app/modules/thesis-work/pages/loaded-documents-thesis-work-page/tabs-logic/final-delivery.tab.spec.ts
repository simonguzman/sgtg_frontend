import { FinalDeliveryTabConfig } from './final-delivery.tab';
import { stateList } from '../../../../../core/enums/state.enum';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { ThesisEvaluationContext } from './tab-config.interface';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { contextoDePestana } from '../../../../../testing/contexto-de-pestana';
import { crearTrabajoEnCurso, crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

const contexto = (thesis: ThesisWork, overrides: Partial<ThesisEvaluationContext> = {}) =>
  FinalDeliveryTabConfig.enrichEvaluationContext(contextoDePestana(thesis, overrides));

describe('FinalDeliveryTabConfig (solicitud de sustentación)', () => {
  it('muestra la solicitud con su estado', () => {
    const filas = FinalDeliveryTabConfig.getTableData([], contexto(thesisWorkDePrueba(crearTrabajoEnSustentacion())));
    expect(filas).toEqual([expect.objectContaining({
      id: 'entrega-final', status: stateList.EN_REVISION, allowedActions: ['view-details']
    })]);
  });

  it('sin solicitud no hay filas', () => {
    expect(FinalDeliveryTabConfig.getTableData([], contexto(thesisWorkDePrueba()))).toEqual([]);
  });

  it('el director solicita la sustentación en curso o en prórroga', () => {
    for (const etapa of ['EN_CURSO', 'PRORROGA'] as const) {
      const botones = FinalDeliveryTabConfig.getHeaderButtons(
        contexto(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa })), { isDirector: true }));
      expect(botones).toEqual([expect.objectContaining({ label: 'Solicitar sustentación', disabled: false })]);
    }
  });

  it('suspendido no se solicita', () => {
    const botones = FinalDeliveryTabConfig.getHeaderButtons(
      contexto(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'SUSPENDIDO' })), { isDirector: true }));
    expect(botones).toEqual([expect.objectContaining({ label: 'No disponible en esta etapa', disabled: true })]);
  });

  it('ya solicitada, el botón queda deshabilitado', () => {
    const botones = FinalDeliveryTabConfig.getHeaderButtons(
      contexto(thesisWorkDePrueba(crearTrabajoEnSustentacion()), { isDirector: true }));
    expect(botones).toEqual([expect.objectContaining({ label: 'Sustentación solicitada', disabled: true })]);
  });

  it('sin paz y salvo aprobado la solicitud queda no aprobada y el director solicita de nuevo', () => {
    const noAprobada = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [],
      rutaPazYSalvo: null, solicitudNoAprobada: true, revisionesPazYSalvo: [
        { rutaDocumento: '15/TI-F/v1/f.pdf', aprobado: false, observaciones: 'Deuda', fecha: '2026-07-02' }
      ] }));
    expect(FinalDeliveryTabConfig.getTableData([], contexto(noAprobada))).toEqual([expect.objectContaining({
      id: 'entrega-final', status: stateList.NO_APROBADO })]);
    expect(FinalDeliveryTabConfig.getHeaderButtons(contexto(noAprobada, { isDirector: true }))).toEqual([
      expect.objectContaining({ label: 'Solicitar nuevamente la sustentación', disabled: false })]);
  });

  it('otros roles o un trabajo cerrado no ven el botón', () => {
    expect(FinalDeliveryTabConfig.getHeaderButtons(contexto(thesisWorkDePrueba(), { isStudent: true }))).toEqual([]);
    expect(FinalDeliveryTabConfig.getHeaderButtons(
      contexto(thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'CANCELADO' })), { isDirector: true }))).toEqual([]);
  });
});
