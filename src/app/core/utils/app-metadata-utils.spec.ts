import { APP_VERSION, getCurrentYear } from './app-metadata-utils';

describe('App Metadata Utils', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola como medida preventiva, estándar del proyecto
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks(); // 🧹 Restaurar consola nativa
  });

  describe('APP_VERSION', () => {
    it('debería exportar una versión válida en formato semántico (X.Y.Z)', () => {
      expect(APP_VERSION).toBeDefined();
      expect(typeof APP_VERSION).toBe('string');
      expect(APP_VERSION.length).toBeGreaterThan(0);

      // Aseguramos que alguien no cambie la versión a un string inválido por error ("vUno")
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('getCurrentYear()', () => {
    it('debería retornar el año actual basándose en el reloj del sistema', () => {
      // Arrange: Congelamos el tiempo de forma estricta para garantizar determinismo
      jest.useFakeTimers();

      // Simulamos estar en el año 2026
      const mockDate = new Date('2026-08-24T12:00:00Z');

      // 🔥 CORRECCIÓN: Le pasamos los milisegundos exactos usando .getTime()
      jest.setSystemTime(mockDate.getTime());

      // Act
      const result = getCurrentYear();

      // Assert
      expect(result).toBe(2026);

      // Cleanup: Vital para no afectar a otras pruebas
      jest.useRealTimers();
    });
  });
});
