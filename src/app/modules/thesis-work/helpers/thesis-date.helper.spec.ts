import { formatThesisDate, ensureDate } from './thesis-date.helper';

describe('Date Helpers', () => {
  const FIXED_SYSTEM_DATE = new Date('2024-05-20T12:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_SYSTEM_DATE.getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.spyOn(console, 'error').mockRestore();
    jest.spyOn(console, 'warn').mockRestore();
  });

  describe('formatThesisDate', () => {
    it('debe formatear una fecha específica al patrón "DD - MM - YYYY"', () => {
      const date = new Date(2023, 10, 15);
      const result = formatThesisDate(date);

      expect(result).toBe('15 - 11 - 2023');
    });

    it('debe usar la fecha actual del sistema si no se pasa ningún argumento', () => {
      const result = formatThesisDate();

      const expectedString = FIXED_SYSTEM_DATE
        .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replaceAll('/', ' - ');

      expect(result).toBe(expectedString);
    });
  });

  describe('ensureDate', () => {
    it('debe retornar la misma instancia si se pasa un objeto Date válido', () => {
      const validDate = new Date('2024-01-01T00:00:00Z');
      const result = ensureDate(validDate);

      expect(result).toBe(validDate);
    });

    it('debe retornar la fecha actual segura si se pasa un objeto Date inválido (NaN)', () => {
      const invalidDate = new Date('fecha-invalida-que-genera-nan');
      const result = ensureDate(invalidDate);

      expect(result).toEqual(FIXED_SYSTEM_DATE);
    });

    it('debe parsear y retornar un nuevo Date si se pasa un string ISO con formato válido', () => {
      const dateString = '2024-12-31T12:00:00';
      const result = ensureDate(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11);
      expect(result.getDate()).toBe(31);
    });

    it('debe retornar la fecha actual segura si se pasa un string de fecha inválido', () => {
      const result = ensureDate('no-es-una-fecha-ni-de-broma');
      expect(result).toEqual(FIXED_SYSTEM_DATE);
    });

    it('debe retornar la fecha actual segura si se pasa un string vacío o con solo espacios', () => {
      expect(ensureDate('    ')).toEqual(FIXED_SYSTEM_DATE);
      expect(ensureDate('')).toEqual(FIXED_SYSTEM_DATE);
    });

    it('debe retornar la fecha actual segura si se pasa undefined o null', () => {
      expect(ensureDate(undefined)).toEqual(FIXED_SYSTEM_DATE);
      expect(ensureDate(null)).toEqual(FIXED_SYSTEM_DATE);
    });

    it('debe protegerse contra tipos de datos no contemplados (programación defensiva)', () => {
      // @ts-expect-error: Inyección deliberada de un tipo de dato que no cumple la firma
      const result = ensureDate(1716206400000);

      expect(result).toEqual(FIXED_SYSTEM_DATE);
    });
  });
});
