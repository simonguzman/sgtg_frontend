import { CorrespondenceTabConfig } from './correspondence.tab';
import { stateList } from '../../../../../core/enums/state.enum';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { contextoDePestana } from '../../../../../testing/contexto-de-pestana';
import { crearTrabajoEnSustentacion } from '../../../../../testing/trabajo-grado-de-prueba';

describe('CorrespondenceTabConfig (versión definitiva)', () => {
  it('lista la versión definitiva (formato H)', () => {
    const finalizado = thesisWorkDePrueba(crearTrabajoEnSustentacion({
      estado: 'FINALIZADA', rutaVersionDefinitiva: '15/TI-H/v1/definitiva.pdf', fechaVersionDefinitiva: '2026-07-25'
    }, { etapa: 'FINALIZADO' }));
    const contexto = CorrespondenceTabConfig.enrichEvaluationContext(contextoDePestana(finalizado));
    expect(contexto.hasCorrespondence).toBe(true);
    expect(CorrespondenceTabConfig.getTableData(finalizado.documents, contexto)).toEqual([expect.objectContaining({
      name: 'Formato H (versión definitiva)', status: stateList.APROBADO, allowedActions: ['view-details']
    })]);
  });

  it('el coordinador la carga cuando la sustentación está aprobada', () => {
    const aprobada = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'APROBADA' }));
    expect(CorrespondenceTabConfig.getHeaderButtons(contextoDePestana(aprobada, { isCoordinator: true })))
      .toEqual([expect.objectContaining({ label: 'Cargar versión definitiva', disabled: false })]);
  });

  it('antes de aprobarse, el botón del coordinador queda deshabilitado', () => {
    const programada = thesisWorkDePrueba(crearTrabajoEnSustentacion());
    expect(CorrespondenceTabConfig.getHeaderButtons(contextoDePestana(programada, { isCoordinator: true })))
      .toEqual([expect.objectContaining({ label: 'Disponible al aprobarse la sustentación', disabled: true })]);
  });

  it('el otro jurado y los demás roles no ven el botón', () => {
    const aprobada = thesisWorkDePrueba(crearTrabajoEnSustentacion({ estado: 'APROBADA' }));
    expect(CorrespondenceTabConfig.getHeaderButtons(contextoDePestana(aprobada, { isJuror: true }))).toEqual([]);
    expect(CorrespondenceTabConfig.getHeaderButtons(contextoDePestana(aprobada, { isDirector: true }))).toEqual([]);
  });
});
