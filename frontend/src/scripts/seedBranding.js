// src/scripts/seedBrandingCasillas.js
import { db } from "@/services/firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";

const seedCasillas = async (uid) => {
  const ref = doc(db, "usuarios", uid, "legajos", "perfil");
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const perfil = snap.data();
    if (!perfil.branding.casillas) {
      perfil.branding.casillas = [
        {
          nombre: "Casilla de Expedientes",
          icono: "📁",
          modulos: [
            { key: "expedientes", label: "Expedientes", route: "/casilla-expedientes", visible: true },
          ],
        },
        {
          nombre: "Agenda de Audiencias",
          icono: "📅",
          modulos: [
            { key: "agenda", label: "Agenda", route: "/agenda", visible: true },
          ],
        },
        {
          nombre: "Notificaciones",
          icono: "🔔",
          modulos: [
            { key: "notificaciones", label: "Notificaciones", route: "/notificaciones", visible: true },
          ],
        },
      ];
      await setDoc(ref, perfil, { merge: true });
      console.log("Casillas agregadas para", uid);
    }
  }
};

// Llama con el UID de prueba
seedCasillas("UID_DE_TU_USUARIO_DEMO");
