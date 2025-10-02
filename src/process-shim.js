// Carga esto ANTES que cualquier otra cosa del frontend
if (typeof window !== "undefined") {
  window.process = window.process || {};
  window.process.env = window.process.env || {};
}
