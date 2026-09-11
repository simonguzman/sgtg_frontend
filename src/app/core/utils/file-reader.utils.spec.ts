import { readFileAsDataUrl } from './file-reader.utils';

describe('File Utils: readFileAsDataUrl()', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva, estándar del proyecto
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaura consola y espías de prototipos automáticamente
  });

  it('debería resolver la promesa con una cadena base64 válida cuando el archivo se lee correctamente', async () => {
    const fileContent = 'hello';
    const mockFile = new File([fileContent], 'test.txt', { type: 'text/plain' });

    const result = await readFileAsDataUrl(mockFile);

    expect(result).toBe('data:text/plain;base64,aGVsbG8=');
  });

  it('debería rechazar la promesa con el error nativo si ocurre un problema de lectura', async () => {
    const mockError = new DOMException('Error simulado de lectura de archivo');
    const dummyFile = new File([''], 'dummy.txt');

    jest.spyOn(FileReader.prototype, 'readAsDataURL').mockImplementation(function(this: FileReader) {
      Object.defineProperty(this, 'error', {
        get: () => mockError,
        configurable: true
      });

      setTimeout(() => {
        if (this.onerror) {
          // 🔥 CORRECCIÓN: Casteo directo al tipo exacto requerido por la firma nativa,
          // completamente seguro y sin usar 'any' ni 'unknown'.
          const event = new ProgressEvent('error') as ProgressEvent<FileReader>;
          this.onerror(event);
        }
      }, 0);
    });

    await expect(readFileAsDataUrl(dummyFile)).rejects.toBe(mockError);
  });
});
