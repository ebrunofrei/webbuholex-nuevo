// src/services/chat.js

function getApiBase() {
  const base = import.meta.env.VITE_API_URL || "";
  return base.replace(/\/$/, "");
}

// Chat general
export async function enviarAlChat({ prompt, historial = [], usuarioId, userEmail }) {
  const url = `${getApiBase()}/api/ia?action=chat`;

  const payload = {
    prompt,
    historial,
    usuarioId: usuarioId || "invitado",
    userEmail: userEmail || "",
    modo: "general",
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `Error HTTP ${resp.status}`);
  }

  return data.respuesta;
}

// Chat jurídico especializado
export async function enviarAlLitisbot({ prompt, historial = [], usuarioId, userEmail, materia = "general" }) {
  const url = `${getApiBase()}/api/ia?action=chat`;

  const payload = {
    prompt,
    historial,
    usuarioId: usuarioId || "invitado",
    userEmail: userEmail || "",
    modo: "juridico",
    materia,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(data?.error || `Error HTTP ${resp.status}`);
  }

  return data.respuesta;
}
