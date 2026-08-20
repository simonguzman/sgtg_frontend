/**
 * Convierte un File a una Data URL (base64) vía FileReader.
 *
 * Se centraliza aquí porque la misma necesidad (persistir el contenido
 * real de un archivo subido, sin depender de un Blob URL que el
 * navegador invalida al recargar la página) ya apareció en Propuestas y
 * ahora también en Anteproyecto — con alta probabilidad de repetirse en
 * Trabajo de Grado, que tiene pendiente el mismo patrón de `url: ''`
 * hardcodeado.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
