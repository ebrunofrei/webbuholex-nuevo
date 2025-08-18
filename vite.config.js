import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: '/', // 👈 importante para evitar errores en producción en rutas internas
  plugins: [react()],
  build: {
    outDir: 'dist', // por defecto, pero lo declaramos para claridad
  },
  server: {
    proxy: {
      // Redirige todas las rutas /api/* al microservicio local
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
});
