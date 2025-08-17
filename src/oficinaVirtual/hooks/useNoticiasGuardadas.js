// src/hooks/useNoticiasGuardadas.js
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const LOCAL_KEY = "noticiasGuardadas_buholex";

/**
 * Hook para gestionar las noticias guardadas por usuario.
 * Sincroniza localStorage y Firestore automáticamente.
 */
export function useNoticiasGuardadas() {
  const { user } = useAuth();
  const [guardadas, setGuardadas] = useState([]);

  // Sincroniza localStorage y Firestore al iniciar sesión
  useEffect(() => {
    const fromLocal = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    if (user?.uid) {
      // Si hay usuario, sincroniza con Firestore
      const ref = doc(db, "usuarios", user.uid);
      getDoc(ref).then(snap => {
        let cloud = snap.data()?.noticiasGuardadas || [];
        // Merge (sin duplicados)
        let merged = Array.from(new Set([...fromLocal, ...cloud]));
        setGuardadas(merged);
        // Guarda merge en Firestore y localStorage
        setDoc(ref, { noticiasGuardadas: merged }, { merge: true });
        localStorage.setItem(LOCAL_KEY, JSON.stringify(merged));
      });
    } else {
      setGuardadas(fromLocal);
    }
  }, [user]);

  // Guardar noticia
  const guardarNoticia = useCallback((id) => {
    setGuardadas(prev => {
      if (prev.includes(id)) return prev;
      const updated = [...prev, id];
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      if (user?.uid) {
        setDoc(doc(db, "usuarios", user.uid), { noticiasGuardadas: updated }, { merge: true });
      }
      return updated;
    });
  }, [user]);

  // Quitar noticia
  const quitarNoticia = useCallback((id) => {
    setGuardadas(prev => {
      const updated = prev.filter(x => x !== id);
      localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
      if (user?.uid) {
        setDoc(doc(db, "usuarios", user.uid), { noticiasGuardadas: updated }, { merge: true });
      }
      return updated;
    });
  }, [user]);

  return { guardadas, guardarNoticia, quitarNoticia };
}
