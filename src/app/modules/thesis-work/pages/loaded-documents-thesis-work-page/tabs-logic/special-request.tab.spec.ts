import { SpecialRequestTabConfig } from './special-request.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { SpecialRequestType } from '../../../enums/special-request-type.enum';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import { crearTrabajoEnCurso, crearTrabajoEnCursoCon } from '../../../../../testing/trabajo-grado-de-prueba';
import { DecisionApi } from '../../../../../core/interfaces/api/trabajo-grado-api.interface';

const contexto = (thesisWork: ThesisWork, overrides: Partial<ThesisEvaluationContext> = {}): ThesisEvaluationContext =>
  SpecialRequestTabConfig.enrichEvaluationContext({
    thesisWork, currentUser: { id: '1' } as User, isAdmin: false, isStudent: false, isDirector: false,
    isDecanatura: false, isCodirector: false, isAdvisor: false, isJuror: false, isConsejo: false,
    latestAdvanceId: null, isLatestAdvancePending: false, isArchived: thesisWork.isArchived, ...overrides
  });

const aprobado: DecisionApi = { organo: 'CONSEJO_FACULTAD', resultado: 'APROBADO', acta: null,
  rutaArchivo: '15/RESOLUCION/v2/r.pdf', observaciones: null, fecha: '2026-06-05' };

/** Prórroga pendiente y una suspensión aprobada y reanudada. */
const conSolicitudes = thesisWorkDePrueba(crearTrabajoEnCursoCon({
  prorroga: { meses: 2, rutaSolicitud: '15/SOLICITUD_PRORROGA/v1/p.pdf', fechaSolicitud: '2026-11-01', decision: null },
  suspensiones: [{ rutaSolicitud: '15/SOLICITUD_SUSPENSION/v1/s.pdf', fechaSolicitud: '2026-06-01', decision: aprobado,
    fechaInicio: '2026-06-05', etapaPrevia: 'EN_CURSO', diasRestantes: 100, fechaMaximaReanudacion: '2026-12-05',
    fechaReanudacion: '2026-07-01', rutaReanudacion: '15/REANUDACION/v1/r.pdf', reanudacionAutomatica: false }]
}));

describe('SpecialRequestTabConfig', () => {
  it('tiene la ruta de registro y la columna del tipo de solicitud', () => {
    expect(SpecialRequestTabConfig.headerActionRoute).toBe('register_special_request');
    expect(SpecialRequestTabConfig.columns.map(c => c.field)).toEqual(['type', 'description', 'date', 'status', 'acciones']);
  });

  describe('getTableData', () => {
    it('lista las solicitudes con su tipo y estado', () => {
      const filas = SpecialRequestTabConfig.getTableData([], contexto(conSolicitudes));
      expect(filas.map(f => [f.id, f.type, f.status])).toEqual([
        ['prorroga-0', SpecialRequestType.PRORROGA, stateList.EN_REVISION],
        ['reanudacion-0', SpecialRequestType.REANUDACION, stateList.APROBADO],
        ['suspension-0', SpecialRequestType.SUSPENSION, stateList.APROBADO]
      ]);
    });

    it('el Consejo evalúa solo las pendientes', () => {
      const filas = SpecialRequestTabConfig.getTableData([], contexto(conSolicitudes, { isConsejo: true }));
      expect(filas.map(f => f.allowedActions)).toEqual([
        ['view-details', 'evaluate_special_request'], ['view-details'], ['view-details']
      ]);
    });

    it('los demás solo consultan', () => {
      const filas = SpecialRequestTabConfig.getTableData([], contexto(conSolicitudes, { isDirector: true }));
      expect(filas.every(f => f.allowedActions.join() === 'view-details')).toBe(true);
    });

    it('en un trabajo cerrado no se evalúa', () => {
      const cerrado = { ...conSolicitudes, isArchived: true };
      const filas = SpecialRequestTabConfig.getTableData([], contexto(cerrado, { isConsejo: true }));
      expect(filas.every(f => f.allowedActions.join() === 'view-details')).toBe(true);
    });
  });

  describe('getHeaderButtons', () => {
    it('el director registra solicitudes', () => {
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(thesisWorkDePrueba(), { isDirector: true }))).toEqual([
        expect.objectContaining({ action: 'register_special_request', label: 'Registrar solicitud', disabled: false })
      ]);
    });

    it('los demás roles no ven el botón', () => {
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(thesisWorkDePrueba(), { isAdmin: true }))).toEqual([]);
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(thesisWorkDePrueba(), { isConsejo: true }))).toEqual([]);
    });

    it('en sustentación no hay solicitudes disponibles salvo la cancelación', () => {
      const sustentacion = thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'SUSTENTACION' }));
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(sustentacion, { isDirector: true }))[0].disabled)
        .toBe(false);
    });

    it('sin solicitudes disponibles el botón queda deshabilitado', () => {
      const sinOpciones = thesisWorkDePrueba(crearTrabajoEnCurso({
        etapa: 'SUSTENTACION',
        cancelaciones: [{ rutaSolicitud: '15/SOLICITUD_CANCELACION/v1/c.pdf', fechaSolicitud: '2026-08-01',
          etapaAlSolicitar: 'SUSTENTACION', decision: null }]
      }));
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(sinOpciones, { isDirector: true }))).toEqual([
        expect.objectContaining({ label: 'Sin solicitudes disponibles', disabled: true })
      ]);
    });

    it('un trabajo cerrado no muestra el botón', () => {
      const cerrado = thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'CANCELADO' }));
      expect(SpecialRequestTabConfig.getHeaderButtons(contexto(cerrado, { isDirector: true }))).toEqual([]);
    });
  });
});
