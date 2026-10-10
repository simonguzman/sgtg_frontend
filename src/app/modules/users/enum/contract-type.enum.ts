/**
 * Vinculación de un docente con la universidad (Art. 6). Los valores son las
 * claves del backend (`TipoVinculacion`); quien dirige sin ser de planta
 * necesita un codirector de planta de su mismo departamento.
 */
export enum ContractType {
  PLANTA = 'PLANTA',
  OCASIONAL = 'OCASIONAL',
  CATEDRA = 'CATEDRA',
  ESTUDIANTE_POSGRADO = 'ESTUDIANTE_POSGRADO'
}

/** Etiquetas para mostrar la vinculación. */
export const CONTRACT_TYPE_LABELS: Record<ContractType, string> = {
  [ContractType.PLANTA]: 'De planta',
  [ContractType.OCASIONAL]: 'Ocasional',
  [ContractType.CATEDRA]: 'Cátedra',
  [ContractType.ESTUDIANTE_POSGRADO]: 'Estudiante de posgrado'
};
