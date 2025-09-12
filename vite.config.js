// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist",   // 👈 carpeta de salida estándar en Vercel
    sourcemap: false, // no genera mapas pesados en prod
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: [
      "firebase/app",
      "firebase/auth",
      "firebase/firestore",
      "firebase/storage",
      "firebase/messaging",
    ], // 👈 asegura que Firebase se precompile correctamente
  },
  server: {
    port: 5173,
    host: true, // permite que Vercel y devtools lo reconozcan
  },
  base: "/", // 👈 necesario para que los assets carguen en Vercel
});
