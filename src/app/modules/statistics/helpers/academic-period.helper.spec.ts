import { resolveAcademicPeriod } from './academic-period.helper';

describe('Helper: resolveAcademicPeriod', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });
  describe('Primer Semestre (Periodo 1)', () => {
    it('debería resolver "2026-1" para una fecha en enero (límite inferior)', () => {
      const date = new Date(2026, 0, 15);
      expect(resolveAcademicPeriod(date)).toBe('2026-1');
    });
    it('debería resolver "2026-1" para una fecha a finales de junio (límite superior)', () => {
      const date = new Date(2026, 5, 30);
      expect(resolveAcademicPeriod(date)).toBe('2026-1');
    });
  });
  describe('Segundo Semestre (Periodo 2)', () => {
    it('debería resolver "2026-2" para una fecha a principios de julio (límite inferior)', () => {
      const date = new Date(2026, 6, 1);
      expect(resolveAcademicPeriod(date)).toBe('2026-2');
    });
    it('debería resolver "2026-2" para una fecha a finales de diciembre (límite superior)', () => {
      const date = new Date(2026, 11, 31);
      expect(resolveAcademicPeriod(date)).toBe('2026-2');
    });
  });
  describe('Casos Especiales', () => {
    it('debería manejar correctamente el 29 de febrero en años bisiestos', () => {
      const date = new Date(2024, 1, 29);
      expect(resolveAcademicPeriod(date)).toBe('2024-1');
    });
  });
});
