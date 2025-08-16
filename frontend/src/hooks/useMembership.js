import { useEffect, useState } from "react";

export const useMembership = () => {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkPro() {
      setLoading(true);
      try {
        const token = localStorage.getItem("jwt");
        if (!token) {
          setIsPro(false);
          setLoading(false);
          return;
        }
        const res = await fetch("/api/user/membership", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        });
        const data = await res.json();
        setIsPro(data.isPro === true);
      } catch (e) {
        setIsPro(false);
      }
      setLoading(false);
    }
    checkPro();
  }, []);

  // Forzar actualización (ej: después de un pago)
  const refreshMembership = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("jwt");
      const res = await fetch("/api/user/membership", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setIsPro(data.isPro === true);
    } catch {
      setIsPro(false);
    }
    setLoading(false);
  };

  return { isPro, loading, refreshMembership, setIsPro }; // setIsPro solo para casos especiales
}
