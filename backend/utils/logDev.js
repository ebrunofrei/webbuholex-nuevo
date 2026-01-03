// backend/utils/logDev.js
export function logDev(...args) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[DEV]", ...args);
  }
}
