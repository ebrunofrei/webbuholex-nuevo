import { useState, useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/context/AuthContext";
import { db, auth, storage } from "@/firebase";
/**
 * Hook que obtiene y escucha en tiempo real el perfil del usuario autenticado desde Firestore.
 * Solo intenta conectarse si hay usuario logueado.
 */
export function usePerfilUsuario() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setPerfil(null);
      setCargandoPerfil(false);
      return;
    }

    const ref = doc(db, "usuarios", user.uid);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setPerfil(snap.data());
        } else {
          setPerfil(null);
        }
        setCargandoPerfil(false);
      },
      (error) => {
        console.error("Error al obtener perfil:", error);
        setPerfil(null);
        setCargandoPerfil(false);
      }
    );

    return () => unsub();
  }, [user]);

  return { perfil, cargandoPerfil };
}
