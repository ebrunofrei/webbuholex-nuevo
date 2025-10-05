import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  base: "/",
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  // ⚡ Polyfill mínimo (solo donde es necesario)
  define: {
    global: "window",
  },

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
