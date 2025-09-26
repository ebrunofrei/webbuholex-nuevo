// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Carga variables de entorno (.env.*)
  const env = loadEnv(mode, process.cwd(), "");
  const BACKEND = (env.VITE_BACKEND_URL || "").trim() || "http://localhost:3001";

  // Usa proxy en DEV solo cuando el backend es local
  const useDevProxy = BACKEND.startsWith("http://localhost");

  // Configuración de proxy con rewrite (clave para /api/noticias)
  const proxyConfig = useDevProxy
    ? {
        "/api": {
          target: BACKEND,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, "/api"), // 🔑 evita que dev sirva el archivo crudo
        },
      }
    : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/", // asegura rutas correctas en Vercel
    server: {
      port: 5173,
      host: true, // permite abrir en LAN / móvil
      strictPort: true,
      proxy: proxyConfig,
    },
    preview: {
      port: 4173,
      host: true,
      proxy: proxyConfig,
    },
    build: {
      outDir: "dist",
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
      include: [
        "firebase/app",
        "firebase/auth",
        "firebase/firestore",
        "firebase/storage",
        "firebase/messaging", // si da problemas en dev, quitar y usar VITE_ENABLE_FCM=false
      ],
    },
  };
});
