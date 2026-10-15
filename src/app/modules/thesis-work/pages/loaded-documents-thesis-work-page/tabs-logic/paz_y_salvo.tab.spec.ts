import { PazYSalvoTabConfig } from './paz_y_salvo.tab';
import { stateList } from '../../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { contextoDePestana } from '../../../../../testing/contexto-de-pestana';
import { crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

describe('PazYSalvoTabConfig (solo consulta)', () => {
  it('muestra el paz y salvo (formato F) de la solicitud de sustentación', () => {
    const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion());
    const filas = PazYSalvoTabConfig.getTableData([], PazYSalvoTabConfig.enrichEvaluationContext(contextoDePestana(trabajo)));
    expect(filas).toEqual([expect.objectContaining({
      name: 'Paz y salvo (formato F) - paz-y-salvo', status: stateList.APROBADO, allowedActions: ['view-details']
    })]);
  });

  it('sin solicitud no hay filas', () => {
    expect(PazYSalvoTabConfig.getTableData([], contextoDePestana(thesisWorkDePrueba()))).toEqual([]);
  });

  it('no tiene acciones de registro: Decanatura no participa', () => {
    const trabajo = thesisWorkDePrueba(crearTrabajoEnSustentacion());
    expect(PazYSalvoTabConfig.headerActionRoute).toBeUndefined();
    expect(PazYSalvoTabConfig.getHeaderButtons(contextoDePestana(trabajo, { isAdmin: true, isDecanatura: true })))
      .toEqual([]);
  });
});
