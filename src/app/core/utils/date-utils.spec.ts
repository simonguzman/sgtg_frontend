import { formatDisplayDate, parseDisplayDate, fechaLocalIso, sumarMeses, desdeFechaIso } from './date-utils';

describe('Date Utils', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('formatDisplayDate()', () => {
    it('debe formatear una fecha correctamente al estilo DD - MM - YYYY', () => {
      const date = new Date(2026, 7, 10);
      const result = formatDisplayDate(date);
      expect(result).toBe('10 - 08 - 2026');
    });

    it('debe formatear la fecha actual por defecto si no se reciben argumentos', () => {
      jest.useFakeTimers();
      const fixedToday = new Date(2026, 7, 10);
      jest.setSystemTime(fixedToday.getTime());
      const result = formatDisplayDate();
      expect(result).toBe('10 - 08 - 2026');
      jest.useRealTimers();
    });
  });

  describe('parseDisplayDate()', () => {
    it('debe devolver la misma instancia si el valor ya es un objeto Date', () => {
      const inputDate = new Date('2026-08-10T10:00:00');
      const result = parseDisplayDate(inputDate);
      expect(result).toBe(inputDate);
    });

    it('debe parsear correctamente un string en el formato custom DD - MM - YYYY', () => {
      const displayString = '10 - 08 - 2026';
      const result = parseDisplayDate(displayString);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(7);
      expect(result.getDate()).toBe(10);
    });

    it('debe parsear correctamente un formato ISO estándar delegando al parser nativo', () => {
      const isoString = '2026-08-10T10:00:00.000Z';
      const result = parseDisplayDate(isoString);
      expect(result.getTime()).not.toBeNaN();
      expect(result.toISOString()).toBe(isoString);
    });

    it('debe retornar un Date inválido (NaN) si el valor es null o undefined', () => {
      const resultNull = parseDisplayDate(null);
      const resultUndefined = parseDisplayDate(undefined);
      expect(resultNull.getTime()).toBeNaN();
      expect(resultUndefined.getTime()).toBeNaN();
    });
  });

  describe('fechas para el plazo del Consejo', () => {
    it('fechaLocalIso usa la fecha local, sin corrimiento de zona', () => {
      expect(fechaLocalIso(new Date(2027, 6, 23, 23, 30))).toBe('2027-07-23');
    });

    it('sumarMeses se comporta como LocalDate.plusMonths (fin de mes)', () => {
      expect(sumarMeses(new Date(2027, 0, 31), 1)).toEqual(new Date(2027, 1, 28));
      expect(sumarMeses(new Date(2027, 6, 23), 9)).toEqual(new Date(2028, 3, 23));
      expect(sumarMeses(new Date(2027, 10, 30), 3)).toEqual(new Date(2028, 1, 29));
    });

    it('desdeFechaIso lee el LocalDate del backend como fecha local', () => {
      expect(desdeFechaIso('2027-07-23')).toEqual(new Date(2027, 6, 23));
      expect(desdeFechaIso(null)).toBeNull();
    });
  });
});
