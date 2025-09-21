// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  // Carga variables .env.* (VITE_BACKEND_URL, VITE_ENABLE_FCM, etc.)
  const env = loadEnv(mode, process.cwd(), "");
  const BACKEND = (env.VITE_BACKEND_URL || "").trim() || "http://localhost:3001";

  // Usa proxy en DEV cuando el backend esté en localhost
  const useDevProxy = BACKEND.startsWith("http://localhost");

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    base: "/", // assets correctos en Vercel
    server: {
      port: 5173,
      host: true,      // permite abrir en red local / móviles
      strictPort: true,
      // Proxy solo en desarrollo si el backend es local
      proxy: useDevProxy
        ? {
            "/api": {
              target: BACKEND,
              changeOrigin: true,
            },
          }
        : undefined,
    },
    // Útil para probar el build local sin CORS:
    preview: {
      port: 4173,
      host: true,
      proxy: useDevProxy
        ? {
            "/api": {
              target: BACKEND,
              changeOrigin: true,
            },
          }
        : undefined,
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
        "firebase/messaging", // si molesta en dev, quítalo y pon VITE_ENABLE_FCM=false
      ],
    },
  };
});
