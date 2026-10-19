import { PazYSalvoTabConfig } from './paz_y_salvo.tab';
import { stateList } from '../../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { contextoDePestana } from '../../../../../testing/contexto-de-pestana';
import { crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

describe('PazYSalvoTabConfig (revisión de Decanatura)', () => {
  it('muestra el paz y salvo (formato F) de la solicitud de sustentación', () => {
    const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion());
    const filas = PazYSalvoTabConfig.getTableData([], PazYSalvoTabConfig.enrichEvaluationContext(contextoDePestana(trabajo)));
    expect(filas).toEqual([expect.objectContaining({
      name: 'Formato F (paz y salvo)', status: stateList.APROBADO, allowedActions: ['view-details']
    })]);
  });

  it('sin solicitud no hay filas', () => {
    expect(PazYSalvoTabConfig.getTableData([], contextoDePestana(thesisWorkDePrueba()))).toEqual([]);
  });

  it('Decanatura revisa el paz y salvo de la sustentación solicitada mientras no esté aprobado', () => {
    const boton = (trabajo: ReturnType<typeof thesisWorkDePrueba>, extra = {}) =>
      PazYSalvoTabConfig.getHeaderButtons(contextoDePestana(trabajo, { isDecanatura: true, ...extra }))[0];
    expect(PazYSalvoTabConfig.headerActionRoute).toBe('review_paz_y_salvo');

    const pendiente = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'SOLICITADA', sesiones: [],
      rutaPazYSalvo: null, revisionesPazYSalvo: [
        { rutaDocumento: '15/TI-F/v1/f.pdf', aprobado: false, observaciones: 'Deuda en biblioteca', fecha: '2026-07-02' }
      ] }));
    expect(boton(pendiente)).toEqual(expect.objectContaining({ label: 'Revisar paz y salvo', disabled: false }));
    expect(PazYSalvoTabConfig.getTableData([], contextoDePestana(pendiente))).toEqual([expect.objectContaining({
      status: stateList.NO_APROBADO, observations: 'Deuda en biblioteca' })]);

    expect(boton(thesisWorkDePrueba(crearTrabajoEnSustentacion()))).toEqual(expect.objectContaining({
      label: 'Paz y salvo aprobado', disabled: true }));
    expect(boton(thesisWorkDePrueba())).toEqual(expect.objectContaining({
      label: 'Esperando la solicitud de sustentación', disabled: true }));
    // Los demás solo consultan
    expect(PazYSalvoTabConfig.getHeaderButtons(contextoDePestana(pendiente, { isDirector: true }))).toEqual([]);
  });
});
