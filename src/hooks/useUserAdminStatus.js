import { useAuth } from "../context/AuthContext";
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebase";

export function useUserAdminStatus() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return; // Espera que termine el loading de Auth
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    setChecking(true);
    getDoc(doc(db, "usuarios", user.uid)).then(snap => {
      setIsAdmin(snap.exists() && snap.data().isAdmin === true);
      setChecking(false);
    }).catch(() => {
      setIsAdmin(false);
      setChecking(false);
    });
  }, [user, loading]);

  return { isAdmin, checking, user };
}
