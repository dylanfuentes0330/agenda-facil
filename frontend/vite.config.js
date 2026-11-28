import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En desarrollo, /api y /uploads se redirigen al backend local (puerto 3000).
// En producción todo se sirve desde el mismo dominio: Nginx en EC2 entrega dist/ y envía /api/* a Node.js
// (o, con EnableCloudFront=true, CloudFront enruta /api/* hacia EC2 y el resto hacia S3).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
      '/uploads': 'http://localhost:3000',
    },
  },
  build: { outDir: 'dist', sourcemap: false },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
  },
});
