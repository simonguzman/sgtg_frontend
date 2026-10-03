import { addBusinessDays, getRemainingBusinessDays, formatDisplayDate, parseDisplayDate } from './date-utils';

describe('Date Utils', () => {

  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('addBusinessDays()', () => {
    it('debe sumar días correctamente sin atravesar un fin de semana', () => {
      const startDate = new Date('2026-08-10T10:00:00');
      const result = addBusinessDays(startDate, 3);
      expect(result.getDate()).toBe(13);
      expect(result.getDay()).toBe(4);
    });

    it('debe saltar el fin de semana al sumar días', () => {
      const startDate = new Date('2026-08-13T10:00:00');
      const result = addBusinessDays(startDate, 2);
      expect(result.getDate()).toBe(17);
      expect(result.getDay()).toBe(1);
    });

    it('debe aceptar un string ISO en lugar de un objeto Date', () => {
      const isoString = '2026-08-10T10:00:00Z';
      const result = addBusinessDays(isoString, 1);
      expect(result.getDate()).toBe(11);
    });

    it('debe fijar la hora al final del día si setToEndOfDay es true', () => {
      const startDate = new Date('2026-08-10T10:00:00');
      const result = addBusinessDays(startDate, 1, true);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('debe devolver la fecha base si daysToAdd es menor o igual a 0', () => {
      const startDate = new Date('2026-08-10T10:00:00');
      const resultZero = addBusinessDays(startDate, 0);
      const resultNegative = addBusinessDays(startDate, -5);
      expect(resultZero.getTime()).toBe(startDate.getTime());
      expect(resultNegative.getTime()).toBe(startDate.getTime());
    });

    it('debe devolver la fecha actual si startDate es falsy (vacío o indefinido)', () => {
      jest.useFakeTimers();
      const fakeToday = new Date('2026-08-10T12:00:00');
      jest.setSystemTime(fakeToday.getTime());
      const result = addBusinessDays('', 3);
      expect(result.getTime()).toBe(fakeToday.getTime());
      jest.useRealTimers();
    });
  });

  describe('getRemainingBusinessDays()', () => {
    const fixedToday = new Date('2026-08-10T12:00:00');
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedToday.getTime());
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('debe retornar 0 si la fecha objetivo es el mismo día (ignorando la hora)', () => {
      const targetDate = new Date('2026-08-10T23:59:59');
      const result = getRemainingBusinessDays(targetDate);
      expect(result).toBe(0);
    });

    it('debe calcular correctamente días hábiles hacia el futuro', () => {
      const targetDate = new Date('2026-08-12T10:00:00');
      const result = getRemainingBusinessDays(targetDate);
      expect(result).toBe(2);
    });

    it('debe calcular correctamente los días hábiles saltando el fin de semana', () => {
      const targetDate = new Date('2026-08-17T10:00:00');
      const result = getRemainingBusinessDays(targetDate);
      expect(result).toBe(5);
    });

    it('debe retornar un número negativo para fechas en el pasado (vencidas)', () => {
      const pastDate = new Date('2026-08-06T10:00:00');
      const result = getRemainingBusinessDays(pastDate);
      expect(result).toBe(-2);
    });

    it('debe aceptar un string ISO y evaluarlo correctamente', () => {
      const isoTargetDate = '2026-08-12T10:00:00Z';
      const result = getRemainingBusinessDays(isoTargetDate);
      expect(result).toBe(2);
    });

    it('debe retornar 0 si targetDate es falsy (string vacío)', () => {
      const result = getRemainingBusinessDays('');
      expect(result).toBe(0);
    });
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
});
