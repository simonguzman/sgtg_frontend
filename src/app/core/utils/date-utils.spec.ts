import {  addBusinessDays, getRemainingBusinessDays, formatDisplayDate, parseDisplayDate } from './date-utils';

describe('Date Utils', () => {

  describe('addBusinessDays()', () => {
    it('debe sumar días correctamente sin atravesar un fin de semana', () => {
      // Arrange
      const startDate = new Date('2026-08-10T10:00:00'); // Lunes 10 de Agosto de 2026

      // Act
      const result = addBusinessDays(startDate, 3);

      // Assert
      expect(result.getDate()).toBe(13); // Jueves 13
      expect(result.getDay()).toBe(4); // 4 = Jueves
    });

    it('debe saltar el fin de semana al sumar días', () => {
      // Arrange
      const startDate = new Date('2026-08-13T10:00:00'); // Jueves 13 de Agosto de 2026

      // Act
      const result = addBusinessDays(startDate, 2);

      // Assert
      expect(result.getDate()).toBe(17); // Lunes 17
      expect(result.getDay()).toBe(1); // 1 = Lunes
    });

    it('debe aceptar un string ISO en lugar de un objeto Date', () => {
      // Arrange
      const isoString = '2026-08-10T10:00:00Z'; // Lunes 10

      // Act
      const result = addBusinessDays(isoString, 1);

      // Assert
      expect(result.getDate()).toBe(11); // Martes 11
    });

    it('debe fijar la hora al final del día si setToEndOfDay es true', () => {
      // Arrange
      const startDate = new Date('2026-08-10T10:00:00');

      // Act
      const result = addBusinessDays(startDate, 1, true);

      // Assert
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it('debe devolver la fecha base si daysToAdd es menor o igual a 0', () => {
      // Arrange
      const startDate = new Date('2026-08-10T10:00:00');

      // Act
      const resultZero = addBusinessDays(startDate, 0);
      const resultNegative = addBusinessDays(startDate, -5);

      // Assert
      expect(resultZero.getTime()).toBe(startDate.getTime());
      expect(resultNegative.getTime()).toBe(startDate.getTime());
    });

    it('debe devolver la fecha actual si startDate es nulo o indefinido', () => {
      // Arrange
      jest.useFakeTimers();
      const fakeToday = new Date('2026-08-10T12:00:00');
      jest.setSystemTime(fakeToday.getTime());

      // Act
      const result = addBusinessDays(null as unknown as string, 3);

      // Assert
      expect(result.getTime()).toBe(fakeToday.getTime());

      // Cleanup
      jest.useRealTimers();
    });
  });

  describe('getRemainingBusinessDays()', () => {
    const fixedToday = new Date('2026-08-10T12:00:00'); // Lunes 10 de Agosto, 12:00 PM

    beforeAll(() => {
      jest.useFakeTimers();
      jest.setSystemTime(fixedToday.getTime());
    });

    afterAll(() => {
      jest.useRealTimers();
    });

    it('debe retornar 0 si la fecha objetivo es el mismo día (ignorando la hora)', () => {
      // Arrange
      const targetDate = new Date('2026-08-10T23:59:59');

      // Act
      const result = getRemainingBusinessDays(targetDate);

      // Assert
      expect(result).toBe(0);
    });

    it('debe calcular correctamente días hábiles hacia el futuro', () => {
      // Arrange: Lunes 10 -> Miércoles 12 (Faltan 2 días)
      const targetDate = new Date('2026-08-12T10:00:00');

      // Act
      const result = getRemainingBusinessDays(targetDate);

      // Assert
      expect(result).toBe(2);
    });

    it('debe calcular correctamente los días hábiles saltando el fin de semana', () => {
      // Arrange: Lunes 10 -> Lunes 17 (Faltan 5 días hábiles)
      const targetDate = new Date('2026-08-17T10:00:00');

      // Act
      const result = getRemainingBusinessDays(targetDate);

      // Assert
      expect(result).toBe(5);
    });

    it('debe retornar un número negativo para fechas en el pasado (vencidas)', () => {
      // Arrange: Lunes 10 -> Jueves 06 (Viernes y Lunes = 2 días transcurridos)
      const pastDate = new Date('2026-08-06T10:00:00');

      // Act
      const result = getRemainingBusinessDays(pastDate);

      // Assert
      expect(result).toBe(-2);
    });

    it('debe aceptar un string ISO y evaluarlo correctamente', () => {
      // Arrange
      const isoTargetDate = '2026-08-12T10:00:00Z'; // Miércoles 12

      // Act
      const result = getRemainingBusinessDays(isoTargetDate);

      // Assert
      expect(result).toBe(2);
    });

    it('debe retornar 0 si targetDate es null', () => {
      // Act
      const result = getRemainingBusinessDays(null as unknown as string);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('formatDisplayDate()', () => {
    it('debe formatear una fecha correctamente al estilo DD - MM - YYYY', () => {
      // Arrange (Los meses en JS empiezan en 0, por lo tanto 7 es Agosto)
      const date = new Date(2026, 7, 10);

      // Act
      const result = formatDisplayDate(date);

      // Assert
      expect(result).toBe('10 - 08 - 2026');
    });

    it('debe formatear la fecha actual por defecto si no se reciben argumentos', () => {
      // Arrange
      jest.useFakeTimers();
      const fixedToday = new Date(2026, 7, 10);
      jest.setSystemTime(fixedToday.getTime());

      // Act
      const result = formatDisplayDate();

      // Assert
      expect(result).toBe('10 - 08 - 2026');

      // Cleanup
      jest.useRealTimers();
    });
  });

  describe('parseDisplayDate()', () => {
    it('debe devolver la misma instancia si el valor ya es un objeto Date', () => {
      // Arrange
      const inputDate = new Date('2026-08-10T10:00:00');

      // Act
      const result = parseDisplayDate(inputDate);

      // Assert
      expect(result).toBe(inputDate);
    });

    it('debe parsear correctamente un string en el formato custom DD - MM - YYYY', () => {
      // Arrange
      const displayString = '10 - 08 - 2026';

      // Act
      const result = parseDisplayDate(displayString);

      // Assert
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(7); // Agosto (0 indexado)
      expect(result.getDate()).toBe(10);
    });

    it('debe parsear correctamente un formato ISO estándar delegando al parser nativo', () => {
      // Arrange
      // Añadimos explícitamente los .000 milisegundos para que coincida exactamente con la salida de .toISOString()
      const isoString = '2026-08-10T10:00:00.000Z';

      // Act
      const result = parseDisplayDate(isoString);

      // Assert
      expect(result.getTime()).not.toBeNaN();
      expect(result.toISOString()).toBe(isoString);
    });

    it('debe retornar un Date inválido (NaN) si el valor es null o undefined', () => {
      // Act
      const resultNull = parseDisplayDate(null);
      const resultUndefined = parseDisplayDate(undefined);

      // Assert
      expect(resultNull.getTime()).toBeNaN();
      expect(resultUndefined.getTime()).toBeNaN();
    });
  });

});
