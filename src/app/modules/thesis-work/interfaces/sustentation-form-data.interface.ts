/**
 * Reemplaza el parámetro `formData: any` en saveSustentationRegistryMock.
 * Refleja exactamente los campos que el formulario de programación de sustentación emite.
 */
export interface SustentationFormData {
  juror1?: string;
  juror2?: string;
  sustentationDate?: string | Date;
  sustentationTime?: string;
  location?: string;
  formatEDocument?: {
    id?:       string;
    name?:     string;
    fileName?: string;
    url?:      string;
  };
}
