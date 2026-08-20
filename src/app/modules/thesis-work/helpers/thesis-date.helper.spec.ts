import { formatThesisDate, ensureDate } from './thesis-date.helper';

describe('Date Helpers', () => {
  // Congelamos el tiempo en una fecha específica para que los tests sean deterministas
  const FIXED_SYSTEM_DATE = new Date('2024-05-20T12:00:00Z');

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_SYSTEM_DATE.getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('formatThesisDate', () => {
    it('Debe formatear una fecha específica al patrón "DD - MM - YYYY"', () => {
      // Instanciamos el 15 de Noviembre de 2023 (el mes es base 0)
      const date = new Date(2023, 10, 15);
      const result = formatThesisDate(date);

      expect(result).toBe('15 - 11 - 2023');
    });

    it('Debe usar la fecha actual del sistema si no se pasa ningún argumento', () => {
      const result = formatThesisDate();

      // Construimos el string esperado basado en el tiempo congelado (FIXED_SYSTEM_DATE)
      const expectedString = FIXED_SYSTEM_DATE
        .toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replaceAll('/', ' - ');

      expect(result).toBe(expectedString);
    });
  });

  describe('ensureDate', () => {
    it('Debe retornar la misma fecha si se pasa un objeto Date válido', () => {
      const validDate = new Date('2024-01-01T00:00:00Z');
      expect(ensureDate(validDate)).toBe(validDate);
    });

    it('Debe retornar la fecha actual si se pasa un objeto Date inválido (NaN)', () => {
      const invalidDate = new Date('fecha-invalida');
      expect(ensureDate(invalidDate)).toEqual(FIXED_SYSTEM_DATE);
    });

    it('Debe parsear y retornar un Date si se pasa un string con formato válido', () => {
      // Agregamos 'T12:00:00' (mediodía) para asegurar que los desfases
      // de zona horaria no cambien el día de la fecha resultante.
      const dateString = '2024-12-31T12:00:00';
      const result = ensureDate(dateString);

      expect(result).toBeInstanceOf(Date);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // Diciembre
      expect(result.getDate()).toBe(31);
    });

    it('Debe retornar la fecha actual si se pasa un string inválido', () => {
      expect(ensureDate('no-es-una-fecha')).toEqual(FIXED_SYSTEM_DATE);
    });

    it('Debe retornar la fecha actual si se pasa un string vacío o con solo espacios', () => {
      expect(ensureDate('   ')).toEqual(FIXED_SYSTEM_DATE);
      expect(ensureDate('')).toEqual(FIXED_SYSTEM_DATE);
    });

    it('Debe retornar la fecha actual si se pasa undefined o null', () => {
      expect(ensureDate(undefined)).toEqual(FIXED_SYSTEM_DATE);
      expect(ensureDate(null)).toEqual(FIXED_SYSTEM_DATE);
    });
  });
});
