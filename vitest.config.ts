import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    server: {
      deps: {
        external: [/^node:sqlite$/],
      },
    },
  },
  resolve: { alias: { "@": new URL(".", import.meta.url).pathname } },
});
