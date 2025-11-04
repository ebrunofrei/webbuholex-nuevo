import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";

// Guardamos SOLO IDs en localStorage para no mezclar tipos
const LOCAL_KEY = "noticiasGuardadas_buholex_ids";


// Normaliza cualquier forma de entrada (string id, {_id}, {id})
function toId(x) {
  if (!x) return null;
  if (typeof x === "string") return x.trim();
  if (typeof x === "object") return x._id ?? x.id ?? null;
  return null;
}
// Normaliza arrays: mezcla, quita nulos/duplicados
function normalizeIdArray(arr) {
  return Array.from(
    new Set((arr || []).map(toId).filter(Boolean))
  );
}

export function useNoticiasGuardadas() {
  const { user } = useAuth();
  const [guardadas, setGuardadas] = useState([]); // siempre array de IDs (strings)
  const userId = user?.uid || null;

  // Lee localStorage de forma segura
  const readLocal = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
      return normalizeIdArray(raw);
    } catch {
      return [];
    }
  };
  const writeLocal = (ids) => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(normalizeIdArray(ids)));
    } catch {}
  };

  // Sincroniza local + servidor al montar o cambiar user
  useEffect(() => {
    let cancelled = false;

    const fromLocal = readLocal();

    // Si no hay usuario, solo usa local
    if (!userId) {
      if (!cancelled) setGuardadas(fromLocal);
      return;
    }

    // Si hay usuario: trae del servidor y mergea con local
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/noticias-guardadas?userId=${encodeURIComponent(userId)}`);
        const data = await res.json();

        // data puede ser array de ids o de objetos → normalizamos a ids
        const fromServer = normalizeIdArray(data);

        // merge (local tiene preferencia pero realmente da igual porque son ids)
        const merged = normalizeIdArray([...fromLocal, ...fromServer]);

        if (!cancelled) {
          setGuardadas(merged);
        }

        // Persistimos en servidor y local
        writeLocal(merged);
        await fetch(`${BASE_URL}/noticias-guardadas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, guardadas: merged }),
        });
      } catch (e) {
        // Si el servidor falla, nos quedamos con local
        if (!cancelled) setGuardadas(fromLocal);
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Guardar (id puede venir como string u objeto → lo normalizamos)
  const guardarNoticia = useCallback(async (noticiaOrId) => {
    const id = toId(noticiaOrId);
    if (!id) return;

    setGuardadas((prev) => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      writeLocal(updated);

      // Sincroniza con backend si hay usuario
      if (userId) {
        fetch(`${BASE_URL}/noticias-guardadas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, guardadas: updated }),
        }).catch(() => {});
      }
      return updated;
    });
  }, [userId]);

  // Quitar
  const quitarNoticia = useCallback(async (noticiaOrId) => {
    const id = toId(noticiaOrId);
    if (!id) return;

    setGuardadas((prev) => {
      const updated = prev.filter((x) => x !== id);
      writeLocal(updated);

      if (userId) {
        fetch(`${BASE_URL}/noticias-guardadas`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, guardadas: updated }),
        }).catch(() => {});
      }
      return updated;
    });
  }, [userId]);

  return { guardadas, guardarNoticia, quitarNoticia };
}
