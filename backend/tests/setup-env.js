import dotenv from 'dotenv';
import { inject } from 'vitest';

dotenv.config({ path: '.env.test' }); // las variables ya definidas (p. ej. en CI) tienen prioridad
// Base de datos temporal creada por global-setup.js para esta ejecución.
process.env.DATABASE_URL = inject('databaseUrl');
