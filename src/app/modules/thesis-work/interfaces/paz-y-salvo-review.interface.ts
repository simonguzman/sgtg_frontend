/**
 * Revisión del paz y salvo (formato F) de Decanatura: si el estudiante está a
 * paz y salvo y las observaciones, obligatorias cuando no se aprueba.
 */
export interface PazYSalvoReviewPayload {
  approved: boolean;
  observations: string;
}
