// src/oficinaVirtual/hooks/useNoticiasGuardadas.js
import { useEffect, useState, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { joinApi } from "@/services/apiBase";

// Guardamos SOLO IDs en localStorage para no mezclar tipos
const LOCAL_KEY = "noticiasGuardadas_buholex_ids";

const IS_BROWSER = typeof window !== "undefined" && !!window.localStorage;

/* ----------------------------- Normalizadores ----------------------------- */
function toId(x) {
  if (!x) return null;
  if (typeof x === "string") return x.trim();
  if (typeof x === "object") return x._id ?? x.id ?? null;
  return null;
}

function normalizeIdArray(arr) {
  return Array.from(new Set((arr || []).map(toId).filter(Boolean)));
}

function normalizeServerPayload(json) {
  if (!json) return [];
  if (Array.isArray(json)) return normalizeIdArray(json);
  const candidates =
    json.items ??
    json.ids ??
    json.data?.items ??
    json.data?.ids ??
    json.data ??
    [];
  return normalizeIdArray(candidates);
}

/* ------------------------------ LocalStorage ------------------------------ */
function readLocal() {
  if (!IS_BROWSER) return [];
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    return normalizeIdArray(raw);
  } catch {
    return [];
  }
}

function writeLocal(ids) {
  if (!IS_BROWSER) return;
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeIdArray(ids)));
  } catch {}
}

/* ----------------------------- Fetch helpers ------------------------------ */
async function fetchWithTimeout(url, opts = {}, ms = 10000) {
  const ctrl = new AbortController();
  const { signal, ...rest } = opts;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...rest, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function postGuardadas(userId, guardadas, { signal } = {}) {
  const resp = await fetchWithTimeout(
    joinApi("/noticias-guardadas"),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, guardadas: normalizeIdArray(guardadas) }),
      signal,
    },
    10000
  );
  // No rompemos si el backend devuelve 204 o shape distinto
  if (!resp.ok) {
    const msg = await resp.text().catch(() => "");
    throw new Error(`POST /noticias-guardadas ${resp.status} ${msg || ""}`.trim());
  }
  return resp
    .json()
    .then(normalizeServerPayload)
    .catch(() => normalizeIdArray(guardadas));
}

/* --------------------------------- Hook ---------------------------------- */
export function useNoticiasGuardadas() {
  const { user } = useAuth();
  const userId = user?.uid || null;

  const [guardadas, setGuardadas] = useState(() => readLocal());
  const abortRef = useRef(null);

  // Sync inicial y cuando cambie el usuario
  useEffect(() => {
    // Cancelar operaciones previas
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const localIds = readLocal();

    // Sin usuario: solo local
    if (!userId) {
      setGuardadas(localIds);
      return () => ctrl.abort();
    }

    // Con usuario: GET + merge + POST
    (async () => {
      try {
        const res = await fetchWithTimeout(
          `${joinApi("/noticias-guardadas")}?userId=${encodeURIComponent(userId)}`,
          { method: "GET", signal: ctrl.signal },
          10000
        );

        if (!res.ok) throw new Error(`GET /noticias-guardadas ${res.status}`);
        const json = await res.json().catch(() => []);
        const serverIds = normalizeServerPayload(json);

        // Merge local + server
        const merged = normalizeIdArray([...localIds, ...serverIds]);

        setGuardadas(merged);
        writeLocal(merged);

        // Persistir en backend la fusión (idempotente)
        try {
          await postGuardadas(userId, merged, { signal: ctrl.signal });
        } catch {
          // Si falla el POST, nos quedamos con el estado local/merge
        }
      } catch {
        // Si falla el GET, mantenemos local (offline-first)
        setGuardadas(localIds);
      }
    })();

    return () => ctrl.abort();
  }, [userId]);

  /* --------------------------- Operaciones públicas --------------------------- */
  const guardarNoticia = useCallback(
    async (noticiaOrId) => {
      const id = toId(noticiaOrId);
      if (!id) return;

      setGuardadas((prev) => {
        if (prev.includes(id)) return prev;
        const updated = normalizeIdArray([...prev, id]);
        writeLocal(updated);

        if (userId) {
          postGuardadas(userId, updated).catch(() => {});
        }
        return updated;
      });
    },
    [userId]
  );

  const quitarNoticia = useCallback(
    async (noticiaOrId) => {
      const id = toId(noticiaOrId);
      if (!id) return;

      setGuardadas((prev) => {
        const updated = prev.filter((x) => x !== id);
        writeLocal(updated);

        if (userId) {
          postGuardadas(userId, updated).catch(() => {});
        }
        return updated;
      });
    },
    [userId]
  );

  return { guardadas, guardarNoticia, quitarNoticia };
}
