import { getEvaluatorsDeadlineLabel, getSingleEvaluationDeadlineLabel, EvaluatorsDeadlineInput } from './deadline-status-label.helper';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';
import * as DateUtils from '../../../core/utils/date-utils';

// ── Funciones Fábrica fuertemente tipadas (Zero 'any', 'unknown') ────────────

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => ({
  id: 'eval-1',
  proposalId: 'prop-1',
  evaluatorId: 'user-1',
  evaluatorName: 'John Doe',
  evaluatorRole: 'Evaluador',
  veredict: stateList.APROBADO,
  observations: '',
  date: new Date(),
  ...overrides
} as Evaluation);

describe('Deadline Status Label Helpers', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante cualquier error capturado
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getEvaluatorsDeadlineLabel()', () => {

    it('debería retornar "Resolución emitida" sin sufijo si está finalizado y no hay evaluaciones previas', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.APROBADO,
        evaluations: []
      };
      expect(getEvaluatorsDeadlineLabel(input)).toBe('Resolución emitida');
    });

    it('debería retornar "Resolución emitida" con estado "A tiempo" si finalizó y todos entregaron a tiempo', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.APROBADO,
        documentId: 'doc-1',
        evaluations: [
          createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME })
        ]
      };
      expect(getEvaluatorsDeadlineLabel(input)).toBe(`Resolución emitida (${EvaluationDeadlineStatus.ON_TIME})`);
    });

    it('debería retornar "Resolución emitida" con estado "Con retraso" si al menos uno se retrasó', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.NO_APROBADO,
        documentId: 'doc-1',
        evaluations: [
          createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME }),
          createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.DELAYED }) // Retrasado
        ]
      };
      expect(getEvaluatorsDeadlineLabel(input)).toBe(`Resolución emitida (${EvaluationDeadlineStatus.DELAYED})`);
    });

    it('debería ignorar evaluaciones que no correspondan al documentId actual', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.APROBADO,
        documentId: 'doc-1',
        evaluations: [
          createMockEvaluation({ documentId: 'doc-viejo', deadlineStatus: EvaluationDeadlineStatus.DELAYED })
        ]
      };
      // Al ignorar el doc-viejo, asume que no hay evaluaciones relevantes
      expect(getEvaluatorsDeadlineLabel(input)).toBe('Resolución emitida');
    });

    it('debería retornar "Sin límite (Consejo)" si no está finalizado y no hay deadline asignado', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.EN_REVISION,
        evaluationDeadline: undefined
      };
      expect(getEvaluatorsDeadlineLabel(input)).toBe('Sin límite (Consejo)');
    });

    it('debería retornar "Evaluación completada" si todos los evaluadores asignados ya entregaron veredicto', () => {
      const input: EvaluatorsDeadlineInput = {
        state: stateList.EN_REVISION,
        evaluationDeadline: new Date(),
        documentId: 'doc-1',
        evaluators: [{}, {}], // 2 evaluadores (no nos importa qué sean internamente)
        evaluations: [
          createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME }),
          createMockEvaluation({ documentId: 'doc-1', deadlineStatus: EvaluationDeadlineStatus.ON_TIME })
        ]
      };
      expect(getEvaluatorsDeadlineLabel(input)).toBe(`Evaluación completada — ${EvaluationDeadlineStatus.ON_TIME} (Esperando Consejo)`);
    });

    describe('Cálculo de días restantes (cuando aún faltan evaluaciones)', () => {
      let dateUtilsSpy: jest.SpyInstance;

      beforeEach(() => {
        dateUtilsSpy = jest.spyOn(DateUtils, 'getRemainingBusinessDays');
      });

      it('debería retornar "Quedan X días hábiles" si el plazo es mayor a 0', () => {
        dateUtilsSpy.mockReturnValue(5);
        const input: EvaluatorsDeadlineInput = { state: stateList.EN_REVISION, evaluationDeadline: new Date() };

        expect(getEvaluatorsDeadlineLabel(input)).toBe('Quedan 5 días hábiles');
      });

      it('debería retornar "¡Vence hoy!" si el plazo es exactamente 0', () => {
        dateUtilsSpy.mockReturnValue(0);
        const input: EvaluatorsDeadlineInput = { state: stateList.EN_REVISION, evaluationDeadline: new Date() };

        expect(getEvaluatorsDeadlineLabel(input)).toBe('¡Vence hoy!');
      });

      it('debería retornar "Plazo vencido" con los días absolutos si es negativo', () => {
        dateUtilsSpy.mockReturnValue(-3);
        const input: EvaluatorsDeadlineInput = { state: stateList.EN_REVISION, evaluationDeadline: new Date() };

        expect(getEvaluatorsDeadlineLabel(input)).toBe('Plazo vencido (3 días hábiles de retraso)');
      });
    });
  });

  describe('getSingleEvaluationDeadlineLabel()', () => {

    it('debería retornar el deadlineStatus de la evaluación si el estado está finalizado', () => {
      const evalMock = createMockEvaluation({ deadlineStatus: EvaluationDeadlineStatus.DELAYED });
      const label = getSingleEvaluationDeadlineLabel(stateList.APROBADO, new Date(), evalMock);

      expect(label).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debería retornar "Evaluación completada" por defecto si finalizó pero no hay status registrado', () => {
      const evalMock = createMockEvaluation({ deadlineStatus: undefined });
      const label = getSingleEvaluationDeadlineLabel(stateList.NO_APROBADO, new Date(), evalMock);

      expect(label).toBe('Evaluación completada');
    });

    it('debería retornar "Sin límite" si no está evaluado y no tiene deadline', () => {
      const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, undefined, undefined);

      expect(label).toBe('Sin límite');
    });

    describe('Cálculo de días restantes (Propuestas activas)', () => {
      let dateUtilsSpy: jest.SpyInstance;

      beforeEach(() => {
        dateUtilsSpy = jest.spyOn(DateUtils, 'getRemainingBusinessDays');
      });

      it('debería retornar "Quedan X días hábiles" si el plazo es mayor a 0', () => {
        dateUtilsSpy.mockReturnValue(10);
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, new Date(), undefined);

        expect(label).toBe('Quedan 10 días hábiles');
      });

      it('debería retornar "¡Vence hoy!" si el plazo es exactamente 0', () => {
        dateUtilsSpy.mockReturnValue(0);
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, new Date(), undefined);

        expect(label).toBe('¡Vence hoy!');
      });

      it('debería retornar "Plazo vencido" con los días absolutos si es negativo', () => {
        dateUtilsSpy.mockReturnValue(-7);
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, new Date(), undefined);

        expect(label).toBe('Plazo vencido (7 días hábiles de retraso)');
      });
    });
  });
});
