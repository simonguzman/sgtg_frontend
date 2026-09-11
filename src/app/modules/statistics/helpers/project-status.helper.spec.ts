import { mapStateToProjectStatus } from './project-status.helper';
import { stateList } from '../../../core/enums/state.enum';
import { ProjectStatus } from '../enum/projectStatus.enum';

describe('Helper: mapStateToProjectStatus', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia (por estándar de la suite)
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar espías
  });

  describe('Mapeo de Estados Estrictos (Diccionario)', () => {
    it('debería mapear APROBADO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.APROBADO)).toBe(ProjectStatus.APROBADO);
    });

    it('debería mapear APROBADO_CON_OBSERVACIONES correctamente', () => {
      expect(mapStateToProjectStatus(stateList.APROBADO_CON_OBSERVACIONES)).toBe(ProjectStatus.APROBADO_OBSERVACIONES);
    });

    it('debería mapear NO_APROBADO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.NO_APROBADO)).toBe(ProjectStatus.NO_APROBADO);
    });

    it('debería mapear EN_REVISION correctamente', () => {
      expect(mapStateToProjectStatus(stateList.EN_REVISION)).toBe(ProjectStatus.EN_REVISION);
    });

    it('debería mapear EN_DESARROLLO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.EN_DESARROLLO)).toBe(ProjectStatus.EN_DESARROLLO);
    });

    it('debería mapear APLAZADO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.APLAZADO)).toBe(ProjectStatus.APLAZADO);
    });

    it('debería mapear SUSPENDIDO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.SUSPENDIDO)).toBe(ProjectStatus.SUSPENDIDO);
    });

    it('debería mapear CANCELADO correctamente', () => {
      expect(mapStateToProjectStatus(stateList.CANCELADO)).toBe(ProjectStatus.CANCELADO);
    });
  });

  describe('Comportamiento de Fallback (Default)', () => {
    it('debería retornar EN_REVISION cuando el estado es EVALUADO (estado intencionalmente excluido)', () => {
      // Como documentaste en el código, EVALUADO no tiene entrada en el mapa
      // por lo que debe disparar el nullish coalescing (??) hacia el fallback.
      expect(mapStateToProjectStatus(stateList.EVALUADO)).toBe(ProjectStatus.EN_REVISION);
    });

    it('debería retornar EN_REVISION ante un estado anómalo (ej: base de datos desactualizada)', () => {
      // Simulamos un estado anómalo proveniente de una respuesta HTTP o base de datos.
      // Hacemos un cast directo a stateList para evitar el linter, simulando el comportamiento de ejecución.
      const anomalousState = 'ESTADO_INVENTADO' as stateList;

      expect(mapStateToProjectStatus(anomalousState)).toBe(ProjectStatus.EN_REVISION);
    });
  });
});
