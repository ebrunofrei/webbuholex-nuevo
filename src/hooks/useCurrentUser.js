import { useEffect, useState } from "react";
import { onAuthStateChanged } from "@/firebase";
import { auth } from "@/firebase"; // Ajusta la ruta si es necesario

export function useCurrentUser() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return unsub;
  }, []);

  return user;
}
