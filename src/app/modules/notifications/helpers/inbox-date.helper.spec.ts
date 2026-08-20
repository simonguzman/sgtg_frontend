import { formatInboxDate } from './inbox-date.helper'; // Ajusta el nombre del archivo según corresponda

describe('Inbox Date Helper', () => {
  describe('formatInboxDate', () => {
    it('Debe formatear correctamente un objeto Date validando el padding de ceros (ej. mes 4 a 04)', () => {
      // Usamos el constructor local (Año, Mes (base 0), Día, Hora, Minuto)
      // Mes 3 equivale a Abril. Día 5, hora 8 y minuto 5 obligan a comprobar los "0" a la izquierda.
      const localDate = new Date(2026, 3, 5, 8, 5);
      const result = formatInboxDate(localDate);

      expect(result).toBe('05/04/2026 08:05');
    });

    it('Debe parsear y formatear correctamente un string de fecha válido', () => {
      // El formato 'YYYY/MM/DD HH:mm:ss' es interpretado como hora local en todos los motores de JS
      const dateString = '2026/11/25 15:30:00';
      const result = formatInboxDate(dateString);

      expect(result).toBe('25/11/2026 15:30');
    });

    it('Debe formatear correctamente fechas sin necesidad de padding (días/meses de 2 dígitos)', () => {
      // 31 de Diciembre a las 23:59 (Mes 11 es Diciembre)
      const endOfYear = new Date(2026, 11, 31, 23, 59);
      const result = formatInboxDate(endOfYear);

      expect(result).toBe('31/12/2026 23:59');
    });

    it('Debe retornar un string vacío si se recibe un objeto Date inválido (NaN)', () => {
      const invalidDate = new Date('fecha-invalida-del-backend');
      const result = formatInboxDate(invalidDate);

      expect(result).toBe('');
    });

    it('Debe retornar un string vacío si se recibe un string que no es una fecha', () => {
      const result = formatInboxDate('este-string-no-es-una-fecha');

      expect(result).toBe('');
    });
  });
});
