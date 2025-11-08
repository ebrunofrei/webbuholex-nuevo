// ============================================================
// 🦉 BÚHOLEX | Configuración Vite (Frontend con proxy IA)
// ============================================================

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => ({
  plugins: [react()],

  build: {
    minify: mode === "production",
    sourcemap: mode !== "production",
    target: "es2022",
  },

  // ============================================================
  // ⚙️ Servidor local (Vite + Proxy Backend)
  // ============================================================
  server: {
    host: "0.0.0.0",   // Permite acceso desde cualquier IP
    port: 5173,        // Puerto del frontend
    open: true,        // Abre navegador automáticamente
    proxy: {
      // Noticias (backend local)
      "/api": {
        target: "",
        changeOrigin: true,
        secure: false,
        ws: true,
        // sin rewrite: mantenemos /api → /api
      },
      // Chat (ruta separada en el frontend)
      "/chat-api": {
        target: "",
        changeOrigin: true,
        secure: false,
        ws: true,
        // En el backend el chat vive bajo /api, así que mapeamos /chat-api → /api
        rewrite: (p) => p.replace(/^\/chat-api/, "/api"),
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
      "@styles": path.resolve(__dirname, "src/styles"),
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
  // (un solo bloque con target + include/exclude)
  // ============================================================
  optimizeDeps: {
    esbuildOptions: { target: "es2022" },
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "firebase/messaging",
    ],
    exclude: ["rss-parser"],
  },
}));
