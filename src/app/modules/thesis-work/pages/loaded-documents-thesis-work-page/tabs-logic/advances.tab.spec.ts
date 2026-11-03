import { AdvancesTabConfig } from './advances.tab';
import { ThesisEvaluationContext } from './tab-config.interface';
import { ThesisWork } from '../../../interfaces/thesis-work.interface';
import { stateList } from '../../../../../core/enums/state.enum';
import { User } from '../../../../users/interfaces/user.interface';
import { thesisWorkDePrueba } from '../../../../../testing/vista-de-prueba';
import {
  crearTrabajoEnCurso, crearTrabajoEnCursoCon, informeDePrueba, reunionDePrueba, revisionDePrueba
} from '../../../../../testing/trabajo-grado-de-prueba';

const usuario = (id: string) => ({ id }) as User;

const contexto = (thesisWork: ThesisWork, overrides: Partial<ThesisEvaluationContext> = {}): ThesisEvaluationContext =>
  AdvancesTabConfig.enrichEvaluationContext({
    thesisWork, currentUser: usuario('1'), isAdmin: false, isStudent: false, isDirector: false, isDecanatura: false,
    isCodirector: false, isAdvisor: false, isJuror: false, isConsejo: false, latestAdvanceId: null,
    isLatestAdvancePending: false, isArchived: thesisWork.isArchived, ...overrides
  });

const conInformes = thesisWorkDePrueba(crearTrabajoEnCursoCon({
  informesMensuales: [informeDePrueba(1, { revisiones: [revisionDePrueba()] }), informeDePrueba(2)]
}));

describe('AdvancesTabConfig (informes mensuales)', () => {
  it('tiene la ruta de carga y las columnas del informe', () => {
    expect(AdvancesTabConfig.headerActionRoute).toBe('upload_advance');
    expect(AdvancesTabConfig.columns.map(c => c.field)).toEqual(['name', 'uploadDate', 'status', 'acciones']);
  });

  describe('getTableData', () => {
    it('lista los informes del más reciente al más antiguo con su estado', () => {
      const filas = AdvancesTabConfig.getTableData([], contexto(conInformes, { isStudent: true, currentUser: usuario('10') }));
      expect(filas.map(f => [f.id, f.name, f.status])).toEqual([
        ['2', 'Informe mensual 2', stateList.EN_REVISION],
        ['1', 'Informe mensual 1', stateList.EVALUADO]
      ]);
      expect(filas.every(f => f.allowedActions.join() === 'view-details')).toBe(true);
    });

    it('el director revisa los informes que aún no ha revisado', () => {
      const filas = AdvancesTabConfig.getTableData([], contexto(conInformes, { isDirector: true }));
      expect(filas.map(f => f.allowedActions)).toEqual([['view-details', 'evaluate-advance'], ['view-details']]);
    });

    it('el codirector y el asesor también revisan (una vez cada uno)', () => {
      const filasCodirector = AdvancesTabConfig.getTableData([],
        contexto(conInformes, { isCodirector: true, currentUser: usuario('5') }));
      const filasAsesor = AdvancesTabConfig.getTableData([],
        contexto(conInformes, { isAdvisor: true, currentUser: usuario('6') }));
      expect(filasCodirector.every(f => f.allowedActions.includes('evaluate-advance'))).toBe(true);
      expect(filasAsesor.every(f => f.allowedActions.includes('evaluate-advance'))).toBe(true);
    });

    it('en un trabajo cerrado no se revisa', () => {
      const cerrado = thesisWorkDePrueba(crearTrabajoEnCursoCon({ informesMensuales: [informeDePrueba(1)] },
        { etapa: 'CANCELADO' }));
      const filas = AdvancesTabConfig.getTableData([], contexto(cerrado, { isDirector: true }));
      expect(filas[0].allowedActions).toEqual(['view-details']);
    });
  });

  describe('getHeaderButtons', () => {
    /** Trabajo con la reunión 2 agendada y recibiendo el informe */
    const recibiendo = (etapa: 'EN_CURSO' | 'PRORROGA' = 'EN_CURSO', modalidad?: 'PRACTICA_PROFESIONAL') =>
      thesisWorkDePrueba(crearTrabajoEnCursoCon({
        reuniones: [reunionDePrueba(1, { realizada: true, estado: 'REALIZADA' }),
          reunionDePrueba(2, { fechaHora: '2026-05-20T10:00:00', lugar: 'Sala', estado: 'AGENDADA', recibeInforme: true })]
      }, { etapa, ...(modalidad ? { modalidad } : {}) }));
    const carga = (botones: ReturnType<typeof AdvancesTabConfig.getHeaderButtons>) =>
      botones.find(boton => boton.action === 'upload_advance');

    it('el estudiante carga el informe de la reunión que lo recibe', () => {
      expect(carga(AdvancesTabConfig.getHeaderButtons(contexto(recibiendo(), { isStudent: true }))))
        .toEqual(expect.objectContaining({ label: 'Cargar informe de la reunión 2', disabled: false }));
    });

    it('sin una reunión que reciba el informe el botón queda deshabilitado', () => {
      expect(AdvancesTabConfig.getHeaderButtons(contexto(thesisWorkDePrueba(), { isStudent: true }))).toEqual([
        expect.objectContaining({ label: 'Sin reunión agendada para recibir el informe', disabled: true })
      ]);
    });

    it('el director también carga informes, en ambas modalidades', () => {
      expect(carga(AdvancesTabConfig.getHeaderButtons(contexto(recibiendo(), { isDirector: true })))?.disabled)
        .toBe(false);
      const practica = recibiendo('EN_CURSO', 'PRACTICA_PROFESIONAL');
      expect(carga(AdvancesTabConfig.getHeaderButtons(contexto(practica, { isDirector: true })))?.disabled).toBe(false);
    });

    it('en prórroga también se cargan informes', () => {
      expect(carga(AdvancesTabConfig.getHeaderButtons(contexto(recibiendo('PRORROGA'), { isStudent: true })))
        ?.disabled).toBe(false);
    });

    it('suspendido o en sustentación el botón queda deshabilitado', () => {
      for (const etapa of ['SUSPENDIDO', 'SUSTENTACION'] as const) {
        const trabajo = thesisWorkDePrueba(crearTrabajoEnCurso({ etapa }));
        expect(AdvancesTabConfig.getHeaderButtons(contexto(trabajo, { isStudent: true }))).toEqual([
          expect.objectContaining({ label: 'Informes no disponibles en esta etapa', disabled: true })
        ]);
      }
    });

    it('con reuniones en el plazo todos ven el botón de reuniones de seguimiento, también en un trabajo cerrado', () => {
      const conReuniones = (etapa: 'EN_CURSO' | 'FINALIZADO') => thesisWorkDePrueba(crearTrabajoEnCursoCon(
        { reuniones: [reunionDePrueba(1)] }, { etapa }));
      expect(AdvancesTabConfig.getHeaderButtons(contexto(conReuniones('EN_CURSO'), { isJuror: true }))).toEqual([
        expect.objectContaining({ action: 'meetings', label: 'Reuniones de seguimiento', variant: 'secondary' })
      ]);
      expect(AdvancesTabConfig.getHeaderButtons(contexto(conReuniones('EN_CURSO'), { isStudent: true }))
        .map(button => button.action)).toEqual(['meetings', 'upload_advance']);
      expect(AdvancesTabConfig.getHeaderButtons(contexto(conReuniones('FINALIZADO'), { isStudent: true }))
        .map(button => button.action)).toEqual(['meetings']);
    });

    it('un trabajo cerrado no muestra el botón', () => {
      const cerrado = thesisWorkDePrueba(crearTrabajoEnCurso({ etapa: 'FINALIZADO' }));
      expect(AdvancesTabConfig.getHeaderButtons(contexto(cerrado, { isStudent: true }))).toEqual([]);
    });
  });

  it('enrichEvaluationContext identifica el último informe y si está en revisión', () => {
    const ctx = contexto(conInformes);
    expect(ctx.latestAdvanceId).toBe('2');
    expect(ctx.isLatestAdvancePending).toBe(true);
  });
});
