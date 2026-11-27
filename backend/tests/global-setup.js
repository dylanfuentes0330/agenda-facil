// Crea una base de datos de pruebas NUEVA y exclusiva para esta ejecución
// (agenda_facil_test_<marca de tiempo>), aplica migraciones y planes, y al
// finalizar elimina únicamente esa base temporal. Nunca toca bases existentes.
import dotenv from 'dotenv';
import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

let tempUrl;
let tempDb;

function run(cmd, env, input) {
  execSync(cmd, { stdio: input ? ['pipe', 'inherit', 'inherit'] : 'inherit', env, input });
}

export default function setup({ provide }) {
  dotenv.config({ path: '.env.test' }); // las variables ya definidas (p. ej. en CI) tienen prioridad
  const base = new URL(process.env.DATABASE_URL);
  tempDb = `agenda_facil_test_${Date.now()}_${process.pid}`;
  // Conexión administrativa a la base de pruebas indicada en .env.test (debe existir).
  const serverUrl = base;
  tempUrl = new URL(base);
  tempUrl.pathname = `/${tempDb}`;

  const env = { ...process.env, DATABASE_URL: tempUrl.toString() };
  run(`npx prisma db execute --url "${serverUrl}" --stdin`, env, `CREATE DATABASE \`${tempDb}\`;`);
  run('npx prisma migrate deploy', env);
  run('node prisma/seed.js', env);
  rmSync('tests/.uploads', { recursive: true, force: true });
  provide('databaseUrl', tempUrl.toString());

  return () => {
    if (process.env.KEEP_TEST_DB === 'true') return;
    run(`npx prisma db execute --url "${serverUrl}" --stdin`, env, `DROP DATABASE IF EXISTS \`${tempDb}\`;`);
  };
}
