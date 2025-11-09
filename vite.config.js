// vite.config.js
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const COMMIT = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || "";
const BUILD_VERSION = COMMIT || new Date().toISOString();

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isProd = mode === "production";
  const DEV_API = String(env.VITE_DEV_API || "http://127.0.0.1:3000").replace(/\/+$/, "");

  return {
    plugins: [react({ jsxRuntime: "automatic" })],
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
    server: {
      host: "0.0.0.0",
      port: 5173,
      cors: true,
      headers: { "Access-Control-Allow-Origin": "*" },
      proxy: {
        "/api": {
          target: DEV_API,
          changeOrigin: true,
          secure: false,
          ws: true,
        },
        "/chat-api": {
          target: DEV_API,
          changeOrigin: true,
          secure: false,
          ws: true,
          rewrite: (p) => p.replace(/^\/chat-api/, "/api"),
        },
      },
    },
    preview: { port: 4173, cors: true },
    define: {
      "process.env": {},                // evita fallos por process.* en browser
      __BUILD_VERSION__: JSON.stringify(BUILD_VERSION),
    },
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
    css: { devSourcemap: !isProd },
    envPrefix: "VITE_",
  };
});
