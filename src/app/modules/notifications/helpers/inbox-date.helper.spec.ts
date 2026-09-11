import { formatInboxDate } from './inbox-date.helper';

describe('Helper: formatInboxDate', () => {

  beforeEach(() => {
    // 🔕 Silenciar consola para mantener terminal limpia ante posibles warnings nativos de JS
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks(); // 🧹 Restaurar espías
  });

  describe('Formateo de Fechas Válidas', () => {
    it('debe formatear correctamente un objeto Date validando el padding de ceros (ej. mes 4 a 04)', () => {
      // Usamos el constructor local (Año, Mes (base 0), Día, Hora, Minuto)
      // Mes 3 equivale a Abril. Día 5, hora 8 y minuto 5 obligan a comprobar los "0" a la izquierda.
      const localDate = new Date(2026, 3, 5, 8, 5);
      const result = formatInboxDate(localDate);

      expect(result).toBe('05/04/2026 08:05');
    });

    it('debe parsear y formatear correctamente un string de fecha válido', () => {
      // El formato 'YYYY/MM/DD HH:mm:ss' es interpretado como hora local en todos los motores de JS
      const dateString = '2026/11/25 15:30:00';
      const result = formatInboxDate(dateString);

      expect(result).toBe('25/11/2026 15:30');
    });

    it('debe formatear correctamente fechas sin necesidad de padding (días/meses de 2 dígitos)', () => {
      // 31 de Diciembre a las 23:59 (Mes 11 es Diciembre)
      const endOfYear = new Date(2026, 11, 31, 23, 59);
      const result = formatInboxDate(endOfYear);

      expect(result).toBe('31/12/2026 23:59');
    });
  });

  describe('Manejo de Errores (Fallback)', () => {
    it('debe retornar un string vacío si se recibe un objeto Date inválido (NaN)', () => {
      const invalidDate = new Date('fecha-invalida-del-backend');
      const result = formatInboxDate(invalidDate);

      expect(result).toBe('');
    });

    it('debe retornar un string vacío si se recibe un string que no es una fecha', () => {
      const result = formatInboxDate('este-string-no-es-una-fecha');

      expect(result).toBe('');
    });
  });
});
