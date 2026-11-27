import dotenv from 'dotenv';
import { inject } from 'vitest';

// Prioridad: variables ya definidas (p. ej. en CI) > .env.test.local (ignorado por Git) > .env.test
dotenv.config({ path: ['.env.test.local', '.env.test'] });
// Base de datos temporal creada por global-setup.js para esta ejecución.
process.env.DATABASE_URL = inject('databaseUrl');
