import { resolveApprovedEvaluationDocument } from './evaluation-utils';
import { Evaluation } from '../interfaces/evaluation.interface';
import { FormattedDocument } from '../interfaces/formatted-document.interface';
import { stateList } from '../enums/state.enum';

const createMockEvaluation = (overrides: Partial<Evaluation> = {}): Evaluation => {
  const baseEvaluation: Evaluation = {
    id: 'eval-1',
    proposalId: 'prop-1',
    documentId: 'doc-1',
    evaluatorId: 'u1',
    evaluatorName: 'Test Evaluator',
    evaluatorRole: 'Jurado',
    veredict: stateList.EN_REVISION,
    observations: 'Sin observaciones',
    signedDocuments: [],
    date: new Date()
  };

  return { ...baseEvaluation, ...overrides };
};

const createMockFormattedDocument = (name: string): FormattedDocument => {
  return {
    name,
    url: `http://localhost/${name}`
  };
};

describe('Evaluation Utils: resolveApprovedEvaluationDocument', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('debería retornar null si el arreglo de evaluaciones es undefined', () => {
    expect(resolveApprovedEvaluationDocument(undefined)).toBeNull();
  });

  it('debería retornar null si el arreglo de evaluaciones está vacío', () => {
    expect(resolveApprovedEvaluationDocument([])).toBeNull();
  });

  it('debería retornar null si ninguna evaluación tiene el veredicto APROBADO', () => {
    const evaluations: Evaluation[] = [
      createMockEvaluation({ veredict: stateList.EN_REVISION }),
      createMockEvaluation({ veredict: stateList.NO_APROBADO }),
      createMockEvaluation({ veredict: stateList.APROBADO_CON_OBSERVACIONES })
    ];

    expect(resolveApprovedEvaluationDocument(evaluations)).toBeNull();
  });

  it('debería retornar null si la evaluación APROBADA existe pero no tiene la propiedad signedDocuments', () => {
    const evaluations: Evaluation[] = [
      createMockEvaluation({ veredict: stateList.APROBADO, signedDocuments: undefined })
    ];

    expect(resolveApprovedEvaluationDocument(evaluations)).toBeNull();
  });

  it('debería retornar null si la evaluación APROBADA existe pero el arreglo signedDocuments está vacío', () => {
    const evaluations: Evaluation[] = [
      createMockEvaluation({ veredict: stateList.APROBADO, signedDocuments: [] })
    ];

    expect(resolveApprovedEvaluationDocument(evaluations)).toBeNull();
  });

  it('debería retornar el primer documento de la ÚLTIMA evaluación APROBADA (gracias al .reverse())', () => {
    const mockDocOld = createMockFormattedDocument('documento-viejo.pdf');
    const mockDocNew = createMockFormattedDocument('documento-reciente.pdf');

    const evaluations: Evaluation[] = [
      createMockEvaluation({ id: '1', veredict: stateList.APROBADO, signedDocuments: [mockDocOld] }),
      createMockEvaluation({ id: '2', veredict: stateList.EN_REVISION }),
      createMockEvaluation({ id: '3', veredict: stateList.APROBADO, signedDocuments: [mockDocNew] }),
      createMockEvaluation({ id: '4', veredict: stateList.NO_APROBADO })
    ];

    const result = resolveApprovedEvaluationDocument(evaluations);

    expect(result).toEqual(mockDocNew);
  });

  it('no debería mutar ni invertir el arreglo original de evaluaciones', () => {
    const evaluations: Evaluation[] = [
      createMockEvaluation({ id: 'eval-1', veredict: stateList.EN_REVISION }),
      createMockEvaluation({ id: 'eval-2', veredict: stateList.APROBADO, signedDocuments: [createMockFormattedDocument('test.pdf')] }),
      createMockEvaluation({ id: 'eval-3', veredict: stateList.NO_APROBADO })
    ];

    const originalLength = evaluations.length;
    const firstIdBefore = evaluations[0].id;
    const lastIdBefore = evaluations[2].id;

    resolveApprovedEvaluationDocument(evaluations);

    expect(evaluations).toHaveLength(originalLength);
    expect(evaluations[0].id).toBe(firstIdBefore);
    expect(evaluations[2].id).toBe(lastIdBefore);
  });
});
