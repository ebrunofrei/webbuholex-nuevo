// src/core/config/env.js
export const env = {
  DEV: Boolean(import.meta.env.DEV),
  MODE: import.meta.env.MODE,
  APP_ENV: String(import.meta.env.VITE_APP_ENV || "prod"),

  API_BASE_URL: String(import.meta.env.VITE_API_BASE_URL || ""),
  POSTHOG_KEY: String(import.meta.env.VITE_POSTHOG_KEY || ""),
  POSTHOG_HOST: String(import.meta.env.VITE_POSTHOG_HOST || "https://app.posthog.com"),

  TENANT_ID: String(import.meta.env.VITE_TENANT_ID || "public"),
};
