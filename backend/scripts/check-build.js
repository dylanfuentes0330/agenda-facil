// "Build" del backend: genera el cliente Prisma (paso previo) y verifica la sintaxis
// de todos los módulos. El backend se ejecuta con Node.js directamente (sin transpilar).
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const files = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full);
    else if (full.endsWith('.js')) files.push(full);
  }
};
walk('src');
walk('prisma');
for (const f of files) execFileSync(process.execPath, ['--check', f], { stdio: 'inherit' });
console.log(`Build OK: ${files.length} módulos verificados.`);
