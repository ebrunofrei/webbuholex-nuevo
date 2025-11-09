// src/services/firebaseMessaging.js
// ============================================================
// FCM Client (silencioso si VITE_ENABLE_FCM !== "true")
// - Cache de soporte y token
// - SW opcional: usa registerFcmServiceWorker() o ready()
// - Sin warns innecesarios cuando está deshabilitado
// ============================================================

import { initMessaging, registerFcmServiceWorker } from "@/firebase";
import {
  getToken,
  onMessage,
  deleteToken,
  isSupported as _isSupported,
} from "firebase/messaging";

const FCM_ENABLED = String(import.meta.env.VITE_ENABLE_FCM) === "true";
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

// ---------- Cache ----------
/** @type {Promise<boolean>|boolean|null} */
let _supportCache = null;
/** @type {string|null} */
let _cachedToken = null;
/** @type {null|(() => void)} */
let _fgUnsubscribe = null;

// ---------- Soporte ----------
/** Comprueba si Firebase Messaging está soportado en este navegador */
export async function isMessagingSupported() {
  if (_supportCache != null) return _supportCache;
  try {
    // guardamos la PROMESA para evitar condiciones de carrera
    _supportCache = _isSupported();
    _supportCache = await _supportCache;
  } catch {
    _supportCache = false;
  }
  return _supportCache;
}

// ---------- Permisos ----------
async function ensureNotificationPermission() {
  if (typeof Notification === "undefined") return false;
  const { permission } = Notification;
  if (permission === "granted") return true;
  if (permission === "denied") return false;
  const result = await Notification.requestPermission().catch(() => "denied");
  return result === "granted";
}

// ---------- Token ----------
/**
 * Obtiene el token FCM (pide permiso si hace falta).
 * @param {{ forceRefresh?: boolean, vapidKey?: string }} [opts]
 * @returns {Promise<string|null>}
 */
export async function solicitarPermisoYToken(opts = {}) {
  try {
    if (!FCM_ENABLED) return null;

    const supported = await isMessagingSupported();
    if (!supported) return null;

    const messaging = await initMessaging();
    if (!messaging) return null;

    // SW: usa el registrador propio si existe; si no, espera el SW por defecto.
    let swReg = null;
    try {
      swReg = (await registerFcmServiceWorker()) || (await navigator.serviceWorker?.ready);
    } catch {
      swReg = await navigator.serviceWorker?.ready;
    }
    if (!swReg) return null;

    const granted = await ensureNotificationPermission();
    if (!granted) return null;

    if (!opts.forceRefresh && _cachedToken) return _cachedToken;

    const token = await getToken(messaging, {
      vapidKey: opts.vapidKey || VAPID_KEY,
      serviceWorkerRegistration: swReg,
    }).catch(() => null);

    _cachedToken = token || null;
    return _cachedToken;
  } catch {
    return null;
  }
}

/** Elimina el token FCM actual (si existe). */
export async function borrarTokenFcm() {
  try {
    if (!FCM_ENABLED) return false;
    const messaging = await initMessaging();
    if (!messaging) return false;

    const ok = await deleteToken(messaging).catch(() => false);
    if (ok) _cachedToken = null;
    return ok;
  } catch {
    return false;
  }
}

// ---------- Mensajes en foreground ----------
/**
 * Escucha mensajes en foreground. Devuelve una función para desuscribirse.
 * @param {(payload:any)=>void} onMessageCallback
 * @returns {() => void}
 */
export function listenToForegroundMessages(onMessageCallback) {
  let disposed = false;

  (async () => {
    if (!FCM_ENABLED) return;
    const supported = await isMessagingSupported();
    if (!supported || disposed) return;

    const messaging = await initMessaging();
    if (!messaging || disposed) return;

    try {
      // Limpia un listener previo si lo hubiera
      if (typeof _fgUnsubscribe === "function") {
        _fgUnsubscribe();
        _fgUnsubscribe = null;
      }
      _fgUnsubscribe = onMessage(messaging, (payload) => {
        try {
          onMessageCallback?.(payload);
        } catch {
          /* no-op */
        }
      });
    } catch {
      /* no-op */
    }
  })();

  return () => {
    disposed = true;
    try {
      if (typeof _fgUnsubscribe === "function") {
        _fgUnsubscribe();
        _fgUnsubscribe = null;
      }
    } catch {
      /* no-op */
    }
  };
}
