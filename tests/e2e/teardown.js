// Limpieza final: borra los datos de inventario "E2E %" con el script del backend.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export default function globalTeardown() {
  const cwd = resolve(process.cwd(), '../App_DistriGo_Backen');
  if (!existsSync(resolve(cwd, 'scripts/limpiar-datos-e2e.js'))) {
    console.warn('[teardown] No existe scripts/limpiar-datos-e2e.js en el backend: no se limpiaron los datos E2E.');
    return;
  }
  const r = spawnSync(process.execPath, ['scripts/limpiar-datos-e2e.js'], { cwd, encoding: 'utf8' });
  if (r.stdout) console.log(r.stdout.trim());
  if (r.stderr) console.warn(r.stderr.trim());
  if (r.status !== 0) console.warn(`[teardown] La limpieza terminó con código ${r.status}.`);
}
