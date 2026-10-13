import { aTrabajoDeGrado, ContextoMapeo } from '../core/mappers/trabajo-grado.mapper';
import { TrabajoGradoResponse } from '../core/interfaces/api/trabajo-grado-api.interface';
import { ThesisWork } from '../modules/thesis-work/interfaces/thesis-work.interface';
import { crearTrabajoEnCurso } from './trabajo-grado-de-prueba';

/** Contexto de mapeo de prueba: sin usuarios conocidos y con la URL de descarga del backend. */
export const contextoDePrueba: ContextoMapeo = {
  usuarios: new Map(),
  urlArchivo: (id, ruta) => `/api/v1/sgtg/trabajos-grado/${id}/archivos?ruta=${encodeURIComponent(ruta)}`
};

/**
 * Trabajo de grado del front (`ThesisWork`) construido con el mapper real desde
 * un trabajo del backend en curso (por defecto, `crearTrabajoEnCurso()`).
 * Participantes: estudiante 10, directora 1.
 */
export function thesisWorkDePrueba(trabajo: TrabajoGradoResponse = crearTrabajoEnCurso()): ThesisWork {
  const thesisWork = aTrabajoDeGrado(trabajo, contextoDePrueba);
  if (!thesisWork) throw new Error('El trabajo de prueba no está en curso');
  return thesisWork;
}
