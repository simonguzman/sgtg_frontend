/** Reporte propio: escribe resultados/<fecha>/resumen.txt con cada caso (en orden SEG-01…SEG-20) y sus verificaciones. */
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Reporter, TestCase, TestResult } from '@playwright/test/reporter';

export default class Resumen implements Reporter {
  private readonly casos = new Map<string, { titulo: string; estado: string; lineas: string[] }>();

  onTestEnd(test: TestCase, resultado: TestResult): void {
    const lineas = test.annotations.filter(a => a.type === 'verificacion').map(a => a.description ?? '');
    if (resultado.status !== 'passed' && !lineas.some(l => l.startsWith('✘'))) {
      const error = resultado.errors[0]?.message?.split('\n')[0];
      if (error) lineas.push(`✘ error: ${error.replace(/\x1b\[[0-9;]*m/g, '')}`);
    }
    const estado = resultado.status === 'passed' ? 'CUMPLE' : resultado.status === 'skipped' ? 'OMITIDO' : 'NO CUMPLE';
    this.casos.set(test.title, { titulo: test.title, estado, lineas });
  }

  onEnd(): void {
    const carpeta = process.env['SGTG_RESULTADOS'];
    if (!carpeta || !this.casos.size) return;
    const casos = [...this.casos.values()].sort((a, b) => a.titulo.localeCompare(b.titulo));
    const cumplen = casos.filter(c => c.estado === 'CUMPLE').length;
    const texto = [
      `Pruebas de seguridad de SGTG — ${new Date().toLocaleString('es-CO')}`, '',
      ...casos.flatMap(c => [`${c.titulo.slice(0, 6)}  ${c.estado.padEnd(10)} ${c.titulo.slice(7)}`,
        ...c.lineas.map(l => `          ${l}`)]),
      '', `Resultado: ${cumplen} de ${casos.length} casos cumplen.`,
    ].join('\n');
    fs.mkdirSync(carpeta, { recursive: true });
    fs.writeFileSync(path.join(carpeta, 'resumen.txt'), texto + '\n');
    console.log(`\n${texto}\n\nEvidencia en: ${carpeta}`);
  }
}
