/**
 * Pruebas de seguridad (Anexo 8, RNF-02) con Playwright Test. Ver README.md.
 *   npm run test:seguridad
 */
import * as path from 'node:path';
import { defineConfig } from '@playwright/test';

// Una carpeta por corrida. Se fija una sola vez: los procesos de las pruebas heredan la variable.
const ahora = new Date();
const dos = (n: number) => String(n).padStart(2, '0');
process.env['SGTG_RESULTADOS'] ??= path.join(__dirname, 'resultados',
  `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}_`
  + `${dos(ahora.getHours())}${dos(ahora.getMinutes())}${dos(ahora.getSeconds())}`);

export default defineConfig({
  testDir: __dirname,
  // .e2e.ts y no .spec.ts: así Jest (que toma todos los *.spec.ts) no las corre
  testMatch: '*.e2e.ts',
  // Un solo proceso y en orden: los casos comparten la copia aislada y el límite por IP de Nginx
  workers: 1,
  fullyParallel: false,
  timeout: 4 * 60_000,
  expect: { timeout: 15_000 },
  globalSetup: './preparacion.ts',
  globalTeardown: './cierre.ts',
  outputDir: path.join(process.env['SGTG_RESULTADOS'], 'playwright'),
  reporter: [['list'], ['./resumen.ts'],
    ['html', { outputFolder: path.join(process.env['SGTG_RESULTADOS'], 'reporte'), open: 'never' }]],
  use: {
    // Edge viene con Windows; con NAVEGADOR=chromium usa el de Playwright (npx playwright install chromium)
    channel: process.env['NAVEGADOR'] === 'chromium' ? undefined : (process.env['NAVEGADOR'] ?? 'msedge'),
    viewport: { width: 1440, height: 810 },
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    actionTimeout: 15_000,
  },
});
