// ============================================================
// 🦉 BúhoLex | Fuente única y blindada de API base (frontend/SSR)
// Prioridad de orígenes:
// 1) VITE_CHAT_API_BASE_URL
// 2) VITE_API_BASE_URL
// 3) VITE_API_BASE
// 4) globalThis.__API_BASE__
// 5) <meta name="api-base" content="...">
// 6) Fallback: origin + /api  |  127.0.0.1:3000/api (dev)  |  "/api"
// ============================================================

/* --------------------------------- Entorno -------------------------------- */
const G = typeof globalThis !== "undefined" ? globalThis : {};
const IS_BROWSER = typeof window !== "undefined" && !!window.location;
const HAS_PROCESS = typeof process !== "undefined" && !!process.env;

const MODE = (
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.MODE) ||
  (HAS_PROCESS ? process.env.NODE_ENV : "") ||
  "production"
).toLowerCase();

/* -------------------------------- Helpers --------------------------------- */
function safeOrigin() {
  try {
    if (IS_BROWSER && window.location?.origin) return window.location.origin;
    if (typeof self !== "undefined" && self.location?.origin) return self.location.origin; // SW/Worker
  } catch {}
  return "";
}

function normalizeBase(input) {
  if (!input) return "";
  let base = String(input).trim();

  // "//host" ⇒ añade protocolo del contexto (o https:)
  if (base.startsWith("//")) {
    const proto = (IS_BROWSER && window.location?.protocol) ? window.location.protocol : "https:";
    base = `${proto}${base}`;
  }

  // quita barras finales
  base = base.replace(/\/+$/, "");
  // compacta /api/api
  base = base.replace(/\/api(?:\/api)+$/i, "/api");

  return base;
}

function isLocalHostLike(urlStr) {
  try {
    const u = new URL(urlStr);
    return u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.hostname === "[::1]";
  } catch { return false; }
}

function isProdOrigin() {
  const o = safeOrigin();
  return !!o && !/localhost|127\.0\.0\.1|\[::1\]/i.test(o);
}

export function isAbsoluteHttp(s = "") {
  return /^https?:\/\//i.test(String(s));
}
export function stripTrailingSlash(s = "") {
  return String(s).replace(/\/+$/, "");
}
export function toQuery(obj = {}) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v == null) continue;
    if (Array.isArray(v)) v.forEach(x => q.append(k, String(x)));
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : "";
}

/* ---------------------------- Resolución de base --------------------------- */
// 1) Env (añadimos CHAT primero)
const ENV = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : {};
const fromEnv =
  normalizeBase(ENV.VITE_CHAT_API_BASE_URL) ||
  normalizeBase(ENV.VITE_API_BASE_URL) ||
  normalizeBase(ENV.VITE_API_BASE) ||
  normalizeBase(HAS_PROCESS ? process.env.API_BASE_URL : "");

// 2) Global override (inyectado en runtime)
const fromGlobal = normalizeBase(G.__API_BASE__);

// 3) <meta name="api-base" content="https://api.buholex.com">
let fromMeta = "";
try {
  if (IS_BROWSER) {
    const c = document.querySelector('meta[name="api-base"]')?.content || "";
    fromMeta = normalizeBase(c);
  }
} catch {}

// 4) Fallback coherente
const origin = safeOrigin();
const fallback = origin
  ? normalizeBase(`${origin}/api`)
  : normalizeBase(MODE === "development" ? "http://127.0.0.1:3000/api" : "/api");

// Resuelto
const picked = fromEnv || fromGlobal || fromMeta || fallback;

export const API_BASE = normalizeBase(picked);
export const API_BASE_SOURCE = fromEnv ? "env" : fromGlobal ? "global" : fromMeta ? "meta" : "fallback";

/* ------------------------------- join / fetch ------------------------------ */
export function joinApi(path = "", baseOverride) {
  if (isAbsoluteHttp(path)) return path;

  const base = stripTrailingSlash(baseOverride || API_BASE);
  let p = String(path || "").trim();
  if (!p.startsWith("/")) p = `/${p}`;

  // evita /api/api si base ya termina en /api
  if (/\/api$/i.test(base) && /^\/api(\/|$)/i.test(p)) {
    p = p.replace(/^\/api/i, "") || "/";
  }

  // compacta barras dobles (sin tocar "http://")
  return `${base}${p}`.replace(/([^:]\/)\/+/g, "$1");
}

export const buildUrl = joinApi;

/**
 * fetch con azúcar:
 * - input relativo → pasa por joinApi()
 * - timeout con AbortController (respeta signal externa)
 * - reintentos (GET/HEAD por defecto) ante 429/5xx
 * - override de base por llamada (init.base)
 */
export async function apiFetch(input, init = {}) {
  const {
    timeoutMs = 15_000,
    retries = 0,
    retryNonIdempotent = false,
    base,
    signal: userSignal,
    ...rest
  } = init;

  const method = String((rest.method || "GET")).toUpperCase();
  const allowRetry = retryNonIdempotent || method === "GET" || method === "HEAD";
  const url = (typeof input === "string") ? joinApi(input, base) : input;

  // Señal compuesta con timeout (DOMException puede no existir en algunos runtimes)
  const controller = new AbortController();
  const timeoutErr = (() => {
    try { return new DOMException("Timeout", "AbortError"); }
    catch { return Object.assign(new Error("Timeout"), { name: "AbortError" }); }
  })();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(timeoutErr), timeoutMs) : null;

  if (userSignal) {
    if (userSignal.aborted) controller.abort(userSignal.reason);
    userSignal.addEventListener("abort", () => controller.abort(userSignal.reason), { once: true });
  }

  const doOnce = () => (G.fetch || fetch)(url, { ...rest, method, signal: controller.signal });

  let attempt = 0;
  try {
    // bucle de reintentos
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const res = await doOnce();
        if (!res.ok && allowRetry && attempt < retries && shouldRetryStatus(res.status)) {
          await delay(backoff(attempt++));
          continue;
        }
        return res;
      } catch (err) {
        const aborted = (err && (err.name === "AbortError" || err.code === "ABORT_ERR"));
        if (!aborted && allowRetry && attempt < retries) {
          await delay(backoff(attempt++));
          continue;
        }
        throw err;
      }
    }
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function shouldRetryStatus(status) {
  return status === 429 || (status >= 500 && status < 600);
}
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function backoff(i) { return Math.min(1000 * 2 ** i, 8000); }

/* ------------------------------- Warnings --------------------------------- */
let __warned = false;
if (!__warned && isProdOrigin() && isLocalHostLike(API_BASE)) {
  __warned = true;
  // eslint-disable-next-line no-console
  console.warn("[BúhoLex] ⚠ API_BASE apunta a loopback en producción:", API_BASE, `(source=${API_BASE_SOURCE})`);
}
