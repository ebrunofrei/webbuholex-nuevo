import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redirige todas las rutas /api/* al microservicio de noticias en el puerto 4000
      '/api': {
        target: 'http://localhost:4000', // <-- Cambia aquí si tu microservicio usa otro puerto
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
