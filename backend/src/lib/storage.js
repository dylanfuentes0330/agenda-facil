// Almacenamiento de archivos (logos de negocios).
// - STORAGE_DRIVER=local: guarda en disco (desarrollo / pruebas).
// - STORAGE_DRIVER=s3: guarda en un bucket S3 PRIVADO y entrega URLs prefirmadas
//   temporales. En EC2 las credenciales salen del perfil de instancia (rol IAM),
//   nunca de claves escritas en el código.
import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const ALLOWED_IMAGE_TYPES = {
  'image/png': { ext: 'png', magic: [0x89, 0x50, 0x4e, 0x47] },
  'image/jpeg': { ext: 'jpg', magic: [0xff, 0xd8, 0xff] },
  'image/webp': { ext: 'webp', magic: [0x52, 0x49, 0x46, 0x46] },
};

export function detectImageType(buffer, declaredType) {
  const spec = ALLOWED_IMAGE_TYPES[declaredType];
  if (!spec) return null;
  const ok = spec.magic.every((byte, i) => buffer[i] === byte);
  return ok ? spec : null;
}

let s3;
const s3Client = () => (s3 ??= new S3Client({ region: env.awsRegion }));

export async function saveLogo(businessId, buffer, contentType, ext) {
  const key = `logos/${businessId}/${randomUUID()}.${ext}`;
  if (env.storageDriver === 's3') {
    await s3Client().send(
      new PutObjectCommand({ Bucket: env.s3Bucket, Key: key, Body: buffer, ContentType: contentType, ServerSideEncryption: 'AES256' }),
    );
  } else {
    const full = path.resolve(env.uploadDir, key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, buffer);
  }
  return key;
}

export async function deleteFile(key) {
  if (!key) return;
  try {
    if (env.storageDriver === 's3') {
      await s3Client().send(new DeleteObjectCommand({ Bucket: env.s3Bucket, Key: key }));
    } else {
      await fs.rm(path.resolve(env.uploadDir, key), { force: true });
    }
  } catch (err) {
    console.warn('No se pudo eliminar el archivo', key, err.message);
  }
}

export async function fileUrl(key) {
  if (!key) return null;
  if (env.storageDriver === 's3') {
    return getSignedUrl(s3Client(), new GetObjectCommand({ Bucket: env.s3Bucket, Key: key }), { expiresIn: 3600 });
  }
  return `/uploads/${key}`;
}
