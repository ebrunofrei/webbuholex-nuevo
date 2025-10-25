// ============================================================
// 🦉 BÚHOLEX | Configuración Vite (Frontend con proxy IA)
// ============================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "/",
  plugins: [react()],

  // ============================================================
  // ⚙️ Servidor local (Vite + Proxy Backend)
  // ============================================================
  server: {
    host: "0.0.0.0",         // Permite acceso desde cualquier IP (necesario para Vite + proxy)
    port: 5173,              // Puerto del frontend
    open: true,              // Abre navegador automáticamente

    proxy: {
      "/api": {
        target: "http://localhost:3000", // Backend local (Express)
        changeOrigin: true,
        secure: false,                   // Permite HTTP sin SSL (local)
        ws: true,                        // Soporte WebSocket (si lo usas)
        rewrite: (path) => path.replace(/^\/api/, "/api"), // Mantiene el prefijo
      },
    },
  },

  // ============================================================
  // ⚡ Polyfill mínimo (solo donde es necesario)
  // ============================================================
  define: {
    global: "window",
  },

  // ============================================================
  // 📁 Alias de rutas absolutas
  // ============================================================
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@pages": path.resolve(__dirname, "src/pages"),
      "@services": path.resolve(__dirname, "src/services"),
      "@utils": path.resolve(__dirname, "src/utils"),
      "@store": path.resolve(__dirname, "src/store"),
      "@context": path.resolve(__dirname, "src/context"),
      "@oficinaPages": path.resolve(__dirname, "src/oficinaVirtual/pages"),
      "@oficinaComponents": path.resolve(__dirname, "src/oficinaVirtual/components"),
      "@oficinaRoutes": path.resolve(__dirname, "src/oficinaVirtual/routes"),
      "@assets": path.resolve(__dirname, "src/assets"),
    },
  },

  // ============================================================
  // 🚀 Optimización de dependencias
  // ============================================================
  optimizeDeps: {
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "firebase/messaging",
    ],
    exclude: ["rss-parser"],
  },
});
