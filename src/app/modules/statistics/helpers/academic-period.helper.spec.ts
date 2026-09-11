import { resolveAcademicPeriod } from './academic-period.helper';

describe('Helper: resolveAcademicPeriod', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar espías
  });

  describe('Primer Semestre (Periodo 1)', () => {
    it('debería resolver "2026-1" para una fecha en enero (límite inferior)', () => {
      // Uso de new Date(año, mes, día). El mes es base 0 (0 = Enero).
      // Esto evita los bugs de desajuste horario UTC.
      const date = new Date(2026, 0, 15);
      expect(resolveAcademicPeriod(date)).toBe('2026-1');
    });

    it('debería resolver "2026-1" para una fecha a finales de junio (límite superior)', () => {
      // 5 = Junio
      const date = new Date(2026, 5, 30);
      expect(resolveAcademicPeriod(date)).toBe('2026-1');
    });
  });

  describe('Segundo Semestre (Periodo 2)', () => {
    it('debería resolver "2026-2" para una fecha a principios de julio (límite inferior)', () => {
      // 6 = Julio. Ahora sí evaluará el mes local correcto sin importar la zona horaria de quien corra el test.
      const date = new Date(2026, 6, 1);
      expect(resolveAcademicPeriod(date)).toBe('2026-2');
    });

    it('debería resolver "2026-2" para una fecha a finales de diciembre (límite superior)', () => {
      // 11 = Diciembre
      const date = new Date(2026, 11, 31);
      expect(resolveAcademicPeriod(date)).toBe('2026-2');
    });
  });

  describe('Casos Especiales', () => {
    it('debería manejar correctamente el 29 de febrero en años bisiestos', () => {
      // 1 = Febrero
      const date = new Date(2024, 1, 29);
      expect(resolveAcademicPeriod(date)).toBe('2024-1');
    });
  });
});
