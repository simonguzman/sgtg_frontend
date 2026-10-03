/**
 * Lee un archivo y lo convierte a una cadena de texto en formato Base64 (Data URL).
 * Útil para previsualizaciones de imágenes o almacenamiento en IndexedDB.
 *
 * @param file El archivo a procesar.
 * @returns Una promesa que se resuelve con la representación del archivo en formato Data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(reader.error?.message || 'Error al leer el archivo'));
    reader.readAsDataURL(file);
  });
}
