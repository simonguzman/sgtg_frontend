import { APP_VERSION, getCurrentYear } from './app-metadata-utils';

describe('App Metadata Utils', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('APP_VERSION', () => {
    it('debería exportar una versión válida en formato semántico (X.Y.Z)', () => {
      expect(APP_VERSION).toBeDefined();
      expect(typeof APP_VERSION).toBe('string');
      expect(APP_VERSION.length).toBeGreaterThan(0);
      expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('getCurrentYear()', () => {
    it('debería retornar el año actual basándose en el reloj del sistema', () => {
      jest.useFakeTimers();
      const mockDate = new Date('2026-08-24T12:00:00Z');
      jest.setSystemTime(mockDate.getTime());
      const result = getCurrentYear();
      expect(result).toBe(2026);
      jest.useRealTimers();
    });
  });
});
