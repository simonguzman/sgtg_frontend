/** Elemento de un catálogo del backend (departamento o programa académico). */
export interface CatalogItem {
  id: number;
  name: string;
  /** Dato complementario que se muestra junto al nombre (ej. el departamento de un programa) */
  detail?: string;
}
