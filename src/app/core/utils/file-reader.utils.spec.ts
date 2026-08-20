import { readFileAsDataUrl } from "./file-reader.utils"; // Ajusta el import

describe('File Utils: readFileAsDataUrl()', () => {
  // Guardamos el constructor original de FileReader para restaurarlo después de cada prueba
  const originalFileReader = global.FileReader;

  afterEach(() => {
    // Restauramos el comportamiento nativo para no afectar otras pruebas
    global.FileReader = originalFileReader;
  });

  it('debería resolver la promesa con una cadena base64 válida cuando el archivo se lee correctamente', async () => {
    // 1. Arrange: Preparamos un archivo de prueba simulado usando la API File
    // La palabra "hello" en base64 es "aGVsbG8="
    const fileContent = 'hello';
    const mockFile = new File([fileContent], 'test.txt', { type: 'text/plain' });

    // 2. Act: Llamamos a la función utilitaria
    const result = await readFileAsDataUrl(mockFile);

    // 3. Assert: Verificamos el prefijo Data URL y la codificación correcta
    expect(result).toBe('data:text/plain;base64,aGVsbG8=');
  });

  it('debería rechazar la promesa con el error nativo si ocurre un problema de lectura', async () => {
    // 1. Arrange: Preparamos un error ficticio
    const mockError = new DOMException('Error simulado de lectura de archivo');

    // Sobrescribimos FileReader globalmente SOLO para esta prueba.
    // Usamos 'unknown' como puente para respetar el tipado estricto sin usar 'any'
    global.FileReader = class MockFileReader {
      onload: ((...args: unknown[]) => void) | null = null;
      onerror: ((...args: unknown[]) => void) | null = null;
      error = mockError; // Inyectamos el error simulado

      readAsDataURL() {
        // Forzamos la ejecución del callback de error de forma asíncrona
        setTimeout(() => {
          if (this.onerror) {
            this.onerror(new ProgressEvent('error'));
          }
        }, 0);
      }
    } as unknown as typeof FileReader;

    const dummyFile = new File([''], 'dummy.txt');

    // 2 & 3. Act & Assert: Verificamos que la promesa sea rechazada con nuestro mockError
    await expect(readFileAsDataUrl(dummyFile)).rejects.toBe(mockError);
  });
});
