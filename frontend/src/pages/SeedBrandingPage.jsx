// src/pages/SeedBrandingPage.jsx

import { useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/services/firebaseConfig";
import { useAuth } from "@/context/AuthContext";

const brandingSeed = {
  nombreEstudio: "Mi Estudio Legal",
  colorPrimary: "#a52e00",
  logoUrl: "https://cdn.buholex.com/logo.png",
  casillas: [
    {
      nombre: "Casilla de Expedientes",
      icono: "📁",
      modulos: [
        {
          key: "expedientes",
          label: "Expedientes",
          route: "/casilla-expedientes",
          visible: true,
        },
      ],
    },
    {
      nombre: "Agenda de Audiencias",
      icono: "📅",
      modulos: [
        {
          key: "agenda",
          label: "Agenda",
          route: "/agenda",
          visible: true,
        },
      ],
    },
    {
      nombre: "Notificaciones",
      icono: "🔔",
      modulos: [
        {
          key: "notificaciones",
          label: "Notificaciones",
          route: "/notificaciones",
          visible: true,
        },
      ],
    },
  ],
};

export default function SeedBrandingPage() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.uid) return;
    async function seed() {
      await setDoc(doc(db, "oficinas", user.uid), brandingSeed, { merge: true });
      alert("Branding y casillas creadas en Firestore para UID: " + user.uid);
    }
    seed();
  }, [user]);
  return (
    <div style={{ padding: 32 }}>
      <h1>Ejecutando seed para el usuario:</h1>
      <p style={{ fontWeight: 600, color: "#a52e00" }}>{user?.uid || "Cargando UID..."}</p>
      <p>Una vez veas el alert de éxito, refresca la Oficina Virtual.</p>
    </div>
  );
}
