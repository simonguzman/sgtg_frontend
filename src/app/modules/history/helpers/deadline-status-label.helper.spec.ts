import { getSingleEvaluationDeadlineLabel, remainingDaysLabel } from './deadline-status-label.helper';
import { stateList } from '../../../core/enums/state.enum';
import { EvaluationDeadlineStatus } from '../../../core/enums/evaluation-deadline-status.enum';
import { Evaluation } from '../../../core/interfaces/evaluation.interface';

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
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getSingleEvaluationDeadlineLabel()', () => {
    it('debería retornar el deadlineStatus de la evaluación si el estado está finalizado', () => {
      const evalMock = createMockEvaluation({ deadlineStatus: EvaluationDeadlineStatus.DELAYED });
      const label = getSingleEvaluationDeadlineLabel(stateList.APROBADO, null, evalMock);
      expect(label).toBe(EvaluationDeadlineStatus.DELAYED);
    });

    it('debería retornar "Evaluación completada" por defecto si finalizó pero no hay status registrado', () => {
      const evalMock = createMockEvaluation({ deadlineStatus: undefined });
      const label = getSingleEvaluationDeadlineLabel(stateList.NO_APROBADO, null, evalMock);
      expect(label).toBe('Evaluación completada');
    });

    it('debería retornar "Sin límite" si no está evaluado y no tiene deadline', () => {
      const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, undefined, undefined);
      expect(label).toBe('Sin límite');
    });

    describe('Días restantes (los calcula el backend; propuestas activas)', () => {
      it('debería retornar "Quedan X días hábiles" si el plazo es mayor a 0', () => {
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, 10, undefined);
        expect(label).toBe('Quedan 10 días hábiles');
      });

      it('debería retornar "¡Vence hoy!" si el plazo es exactamente 0', () => {
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, 0, undefined);
        expect(label).toBe('¡Vence hoy!');
      });

      it('debería retornar "Plazo vencido" con los días absolutos si es negativo', () => {
        const label = getSingleEvaluationDeadlineLabel(stateList.EN_REVISION, -7, undefined);
        expect(label).toBe('Plazo vencido (7 días hábiles de retraso)');
      });
    });
  });

  describe('remainingDaysLabel()', () => {
    it('sin plazo vigente muestra el texto indicado', () => {
      expect(remainingDaysLabel(null)).toBe('Sin límite');
      expect(remainingDaysLabel(undefined, 'Sin plazo')).toBe('Sin plazo');
    });

    it('usa el número del backend tal cual (ya descuenta fines de semana, festivos y días institucionales)', () => {
      expect(remainingDaysLabel(3)).toBe('Quedan 3 días hábiles');
      expect(remainingDaysLabel(0)).toBe('¡Vence hoy!');
      expect(remainingDaysLabel(-1)).toBe('Plazo vencido (1 días hábiles de retraso)');
    });
  });
});
