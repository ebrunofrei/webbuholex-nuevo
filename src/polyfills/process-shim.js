// src/polyfills/process-shim.js
if (typeof window !== "undefined") {
  // no pisa nada si ya existiera
  window.process = window.process || { env: {} };
  // para algunos bundles que miran global
  window.global = window.global || window;
}
