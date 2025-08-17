import { db } from "./firebaseConfig";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";

// --- Firebase: CRUD eventos ---
export async function agregarEvento(evento) {
  // evento = { userId, expedienteId, title, start, end, description, recurrent, googleEventId? }
  const docRef = await addDoc(collection(db, "agenda_litisbot"), evento);
  return docRef.id;
}

export async function obtenerEventosUsuario(userId) {
  const q = query(collection(db, "agenda_litisbot"), where("userId", "==", userId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

export async function obtenerEventosExpediente(expedienteId) {
  const q = query(collection(db, "agenda_litisbot"), where("expedienteId", "==", expedienteId));
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
}

// --- Google Calendar ---
export async function agregarAGoogleCalendar(evento, accessToken) {
  // evento: { title, start, end, description, recurrent }
  const body = {
    summary: evento.title,
    description: evento.description,
    start: { dateTime: new Date(evento.start).toISOString() },
    end: { dateTime: new Date(evento.end).toISOString() },
    recurrence: evento.recurrent ? [`RRULE:${evento.recurrent}`] : undefined,
  };
  const resp = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) throw new Error("Google Calendar error");
  const data = await resp.json();
  return data.id; // googleEventId
}

// --- Notificaciones Push Web/Mobile ---
export async function enviarNotificacion({ titulo, cuerpo, token }) {
  // token: device FCM token o webpush token
  // Implementa con tu backend/Firebase Cloud Messaging
  await fetch("/api/sendNotification", {
    method: "POST",
    body: JSON.stringify({ titulo, cuerpo, token }),
    headers: { "Content-Type": "application/json" }
  });
}
