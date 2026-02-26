// ============================================================
// 🦉 BÚHOLEX | Configuración Vite (Frontend con proxy a API)
// - ESM seguro (sin __dirname): fileURLToPath
// - Proxy dev: /api → backend, /chat-api → /api (alias)
// - Build/Dev pulido y estable en Windows
// ============================================================

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname seguro en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  // Carga .env.* (solo variables con prefijo VITE_ quedarán disponibles en el cliente)
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isProd = mode === "production";

  // Backend de desarrollo (no afecta a producción)
  const DEV_BACKEND = env.VITE_DEV_BACKEND || "http://localhost:3000";

  return {
    plugins: [
      react({
        jsxRuntime: "automatic",
      }),
    ],

    // ============================================================
    // 🔧 Build
    // ============================================================
    build: {
      minify: isProd,
      sourcemap: !isProd,
      target: "es2022",
      reportCompressedSize: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom"],
            firebase: [
              "firebase/app",
              "firebase/auth",
              "firebase/firestore",
              "firebase/storage",
              "firebase/messaging",
            ],
          },
        },
      },
    },

    // ============================================================
    // ⚙️ Servidor local (Vite + Proxy Backend)
    // ============================================================
    server: {
      host: "0.0.0.0",
      port: 5173,
      strictPort: false,
      open: true,
      cors: true,
      headers: {
        "Access-Control-Allow-Origin": "*",
      },
      proxy: {
        // Backend principal (API)
        "/api": {
          target: DEV_BACKEND,   // ✅ sin strings con ${...}
          changeOrigin: true,
          secure: false,
          ws: true,
          // sin rewrite: mantenemos /api → /api
        },

        // Alias de chat SOLO en dev: mapea /chat-api → /api
        "/chat-api": {
          target: DEV_BACKEND,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (p) => p.replace(/^\/chat-api/, "/api"),
        },

         "/exports": {
          target: DEV_BACKEND,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    preview: {
      port: 4173,
      cors: true,
    },

    // ============================================================
    // ⚡ Polyfills/defines mínimos
    // ============================================================
    define: {
      // Evita que libs legacy revienten si miran process.env en cliente
      "process.env": {},
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
    // ============================================================
    optimizeDeps: {
      esbuildOptions: { target: "es2022" },
      include: [
        "react",
        "react-dom",
        "firebase/app",
        "firebase/auth",
        "firebase/firestore",
        "firebase/storage",
        "firebase/messaging",
      ],
      exclude: ["rss-parser"],
    },

    css: {
      devSourcemap: !isProd,
    },

    // Solo variables con prefijo VITE_ entran al bundle del cliente
    envPrefix: "VITE_",
  };
});
