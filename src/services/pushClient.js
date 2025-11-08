// ============================================================
// 🦉 BÚHOLEX | Push Client (FCM en navegador) — robusto
// - Se inicializa SOLO si: https + ENABLE_PUSH=true + soporte FCM
// - Registra/reusa SW y obtiene token con VAPID
// - Permiso explícito opcional (no spamea prompts)
// - Callbacks onToken / onMessage
// - Silencioso si falla (no rompe la app)
// - Util para desregistrar SW de FCM
// ============================================================

import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// Flags por ENV
const ENABLE_PUSH = String(import.meta?.env?.VITE_ENABLE_PUSH ?? "false").toLowerCase() === "true";
const DEBUG_PUSH  = String(import.meta?.env?.VITE_DEBUG_PUSH ?? "false").toLowerCase() === "true";

// Clave pública Web Push (VAPID) — p.ej. "BExxx..."
const VAPID = (import.meta?.env?.VITE_FCM_VAPID_KEY || "").trim();

// Config Firebase (solo claves públicas)
const firebaseConfig = {
  apiKey:             import.meta?.env?.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta?.env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:          import.meta?.env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket:      import.meta?.env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  import.meta?.env?.VITE_FIREBASE_SENDER_ID,
  appId:              import.meta?.env?.VITE_FIREBASE_APP_ID,
  measurementId:      import.meta?.env?.VITE_FIREBASE_MEASUREMENT_ID,
};

let _started = false; // evita doble init

function log(...args) { if (DEBUG_PUSH) console.debug("[Push]", ...args); }

/**
 * Comprueba si vale la pena intentar inicializar.
 */
function shouldInit() {
  if (!ENABLE_PUSH) return false;
  if (typeof window === "undefined") return false;
  if (location.protocol !== "https:") return false;
  if (!("serviceWorker" in navigator)) return false;
  if (!VAPID) { log("Falta VAPID; omitiendo init."); return false; }
  return true;
}

/**
 * Pide permiso de notificaciones (opcional).
 * @returns {"granted"|"denied"|"default"}
 */
async function requestNotifPermissionIfNeeded(askPermission) {
  if (!askPermission || !("Notification" in window)) return Notification?.permission ?? "default";
  try {
    if (Notification.permission === "default") {
      const res = await Notification.requestPermission();
      return res;
    }
    return Notification.permission;
  } catch {
    return "default";
  }
}

/**
 * Inicializa FCM en el cliente.
 * @param {Object} options
 * @param {string} [options.swUrl="/firebase-messaging-sw.js"]  Ruta al SW
 * @param {string} [options.enablePushParam="true"]             Query para el SW (?enablePush=...)
 * @param {boolean} [options.askPermission=true]                Pide permiso al usuario
 * @param {(token:string|null)=>void} [options.onToken]         Callback cuando se obtiene/actualiza token
 * @param {(payload:any)=>void} [options.onMessage]             Callback para mensajes en foreground
 */
export async function initPushClient({
  swUrl = "/firebase-messaging-sw.js",
  enablePushParam = "true",
  askPermission = true,
  onToken,
  onMessage: onMessageCb,
} = {}) {
  if (_started) { log("ya iniciado; skip"); return; }
  if (!shouldInit()) return;
  _started = true;

  try {
    const supported = await isSupported().catch(() => false);
    if (!supported) { log("FCM no soportado en este navegador."); return; }

    // Permiso (si lo pedimos ahora)
    const perm = await requestNotifPermissionIfNeeded(askPermission);
    if (perm === "denied") { log("Permiso denegado; no se solicitará token."); return; }

    // Registrar o reutilizar SW
    const reg = await navigator.serviceWorker.register(
      `${swUrl}?enablePush=${encodeURIComponent(enablePushParam)}`,
      { scope: "/" }
    ).catch(async () => {
      // si falla el registro, intenta reutilizar alguno existente
      const regs = await navigator.serviceWorker.getRegistrations();
      return regs.find(r => r.active?.scriptURL?.includes("firebase-messaging-sw")) || null;
    });

    if (!reg) { log("Sin SW de FCM; omitiendo."); return; }

    // Inicializar Firebase App + Messaging
    const app = initializeApp(firebaseConfig);
    const messaging = getMessaging(app);

    // Obtener token (si el usuario no concedió todavía, getToken puede disparar prompt)
    let token = null;
    try {
      token = await getToken(messaging, { vapidKey: VAPID, serviceWorkerRegistration: reg });
    } catch (e) {
      log("getToken error:", e?.message || e);
      token = null;
    }

    if (typeof onToken === "function") onToken(token);
    log(token ? "Token FCM obtenido." : "Sin token (permiso/no soporte/VAPID).");

    // Mensajes en foreground
    if (typeof onMessageCb === "function") {
      onMessage(messaging, (payload) => {
        try { onMessageCb(payload); } catch {}
      });
    } else {
      // por defecto: log en debug
      onMessage(messaging, (p) => log("onMessage:", p));
    }
  } catch (e) {
    // No rompas la UI por FCM
    log("init omitido por error:", e?.message || e);
  }
}

/**
 * Util: desregistrar cualquier SW de FCM y limpiar caches.
 * Útil para “silenciar” en caliente o depurar.
 */
export async function unregisterFCMIfAny() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    const tasks = regs
      .filter(r => r?.active?.scriptURL?.includes?.("firebase-messaging-sw"))
      .map(r => r.unregister());
    await Promise.all(tasks);
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch {}
    log("FCM: service worker(s) desregistrado(s) y caches limpiados.");
  } catch (e) {
    log("unregister FCM error:", e?.message || e);
  }
}
