// ============================================================
// 🦉 BúhoLex | Capa HTTP única (DEV/PROD)
// - API_BASE resuelto por entorno (Vercel → Railway)
// - joinApi("/ruta") evita // duplicados
// - fetchJSON: timeout, 429/5xx con backoff exponencial + jitter
// - healthCheck: ping no bloqueante/memo simple
// ============================================================

const ORIGIN = typeof window !== "undefined" ? window.location.origin : "";

const ENV_BASE =
  import.meta.env.VITE_CHAT_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "";

export const API_BASE =
  (ENV_BASE && ENV_BASE.replace(/\/$/, "")) ||
  (ORIGIN ? `${ORIGIN.replace(/\/$/, "")}/api` : "/api");

export function joinApi(path = "") {
  const p = String(path || "");
  return p.startsWith("http") ? p : `${API_BASE}${p.startsWith("/") ? "" : "/"}${p}`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
function jitter(base) {
  const d = base * 0.2;
  return base + (Math.random() * 2 - 1) * d;
}

/**
 * fetchJSON con reintentos para 429/5xx
 * @param {string} url
 * @param {RequestInit} init
 * @param {{timeoutMs?:number, retries?:number}} opts
 */
export async function fetchJSON(url, init = {}, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 15000;
  const retries = opts.retries ?? 2;

  let attempt = 0;
  let lastErr;

  while (attempt <= retries) {
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        ...init,
        signal: init.signal || ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
        credentials: init.credentials ?? "include",
      });

      const ctype = res.headers.get("content-type") || "";
      const isJson = ctype.includes("application/json");

      if (!res.ok) {
        // Mensaje más claro si el backend envía JSON
        let msg = `HTTP ${res.status}`;
        if (isJson) {
          try {
            const j = await res.json();
            msg = j?.error || j?.message || msg;
          } catch { /* noop */ }
        } else {
          try { msg = await res.text(); } catch { /* noop */ }
        }

        // Reintentos para 429/5xx
        if (res.status === 429 || (res.status >= 500 && res.status < 600)) {
          throw Object.assign(new Error(msg), { retriable: true, status: res.status });
        }
        throw new Error(msg);
      }

      clearTimeout(to);
      return isJson ? await res.json() : await res.text();
    } catch (err) {
      clearTimeout(to);
      lastErr = err;

      const retriable =
        err?.retriable ||
        err?.name === "AbortError" ||
        err?.message?.includes("timeout");

      if (retriable && attempt < retries) {
        attempt += 1;
        const backoff = jitter(600 * Math.pow(2, attempt)); // 600ms, 1200ms, 2400ms aprox
        await sleep(backoff);
        continue;
      }
      break;
    }
  }

  throw lastErr || new Error("FETCH_ERROR");
}

/* ---------------- Health memo no bloqueante ---------------- */
const _healthMemo = new Map();
/**
 * Comprueba salud del backend una vez por pestaña.
 * @param {string} endpoint p.ej. "/ia/test" o "/ping"
 */
export async function healthCheck(endpoint = "/ia/test") {
  const key = `health:${endpoint}`;
  if (_healthMemo.get(key) === true) return true;

  try {
    await fetchJSON(joinApi(endpoint), { method: "GET" }, { timeoutMs: 6000, retries: 0 });
    _healthMemo.set(key, true);
    return true;
  } catch {
    return false;
  }
}

/* -------------- Utilidad general para POST JSON ----------- */
export function postJSON(path, body, extra = {}) {
  return fetchJSON(
    joinApi(path),
    { method: "POST", body: JSON.stringify(body), ...(extra || {}) }
  );
}
