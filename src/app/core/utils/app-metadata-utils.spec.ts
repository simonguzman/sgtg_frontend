import { APP_VERSION, getCurrentYear } from './app-metadata-utils';

describe('App Metadata Utils', () => {
  it('debería exportar una versión válida', () => {
    expect(APP_VERSION).toBeDefined();
    expect(typeof APP_VERSION).toBe('string');
    expect(APP_VERSION.length).toBeGreaterThan(0);
  });

  it('getCurrentYear debería retornar el año actual del sistema', () => {
    const expectedYear = new Date().getFullYear();
    expect(getCurrentYear()).toBe(expectedYear);
  });
});
