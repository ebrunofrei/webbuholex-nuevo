import { useState, useEffect } from "react"; 
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase"; // Ajusta la ruta según tu estructura real
import { useAuth } from "../../context/AuthContext"; // Ajusta a tu auth real

export function usePerfilOficina() {
  const { user } = useAuth();
  const [perfil, setPerfil] = useState(null);
  const [loading, setLoading] = useState(true);

  // Real-time listener
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "usuarios", user.uid);
    const unsub = onSnapshot(docRef, (snap) => {
      setPerfil(snap.exists() ? snap.data() : null);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Actualiza logo y slogan
  const guardarPerfil = async ({ logoBase64, slogan }) => {
    if (!user) throw new Error("No logueado");
    await setDoc(
      doc(db, "usuarios", user.uid),
      { logoBase64, slogan },
      { merge: true }
    );
  };

  return { perfil, guardarPerfil, loading, user };
}
