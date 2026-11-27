import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Falta la variable de entorno obligatoria ${name}. Revisa backend/.env.example`);
  }
  return value;
}

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = required('JWT_SECRET');
// Valores de ejemplo/prueba conocidos públicamente: nunca deben usarse en producción.
const INSECURE_SECRET = /CAMBIAR|change-me|local-dev|test-secret|ci-only|ejemplo|example/i;
export function assertProductionSecret(secret, isProduction) {
  if (!isProduction) return;
  if (secret.length < 32) throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
  if (INSECURE_SECRET.test(secret)) {
    throw new Error('JWT_SECRET parece un valor de ejemplo o de pruebas. Genera uno aleatorio para producción.');
  }
}
assertProductionSecret(jwtSecret, nodeEnv === 'production');

export const env = {
  nodeEnv,
  isProduction: nodeEnv === 'production',
  isTest: nodeEnv === 'test',
  port: Number(process.env.PORT || 3000),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Número de proxies de confianza delante de Express (CloudFront + Nginx = 2)
  trustProxy: Number(process.env.TRUST_PROXY || 0),
  authRateLimitMax: Number(process.env.RATE_LIMIT_AUTH_MAX || 20),
  storageDriver: process.env.STORAGE_DRIVER || 'local', // local | s3
  uploadDir: process.env.UPLOAD_DIR || 'uploads',
  s3Bucket: process.env.S3_BUCKET || '',
  awsRegion: process.env.AWS_REGION || 'us-east-1',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS || 12),
};
