// src/services/vozService.js
// ======================================================
// 🔌 CONFIG base URL backend
// ======================================================
function getApiBaseUrl() {
  const raw = import.meta.env?.VITE_API_BASE_URL?.trim();
  if (!raw || raw === "") {
    return "http://localhost:3000/api";
  }
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildUrl(path = "/ia/chat") {
  return `${getApiBaseUrl()}${path}`;
}

// ======================================================
// 🎙️ Control global para que no se solapen audios
// ======================================================
let currentAudio = null;

function stopCurrentAudio() {
  try {
    if (currentAudio) {
      currentAudio.pause?.();
      currentAudio.src = "";
      currentAudio = null;
    }
  } catch {
    // silencio
  }
}

/**
 * 🧑‍⚖️ reproducirVozVaronil
 * Envía texto al backend /voz y reproduce el MP3 devuelto (voz varonil abogado).
 */
export async function reproducirVozVaronil(textoPlano) {
  try {
    const limpio = (textoPlano || "").trim();
    if (!limpio || limpio.length < 2) {
      console.warn("[voz] Texto vacío / corto, no se reproduce voz.");
      return;
    }

    // corta audio anterior si estaba sonando
    stopCurrentAudio();

    const VOZ_URL = buildUrl("/voz");

    const resp = await fetch(VOZ_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: limpio }),
    });

    if (!resp.ok) {
      console.warn("[voz] backend respondió !ok:", resp.status, resp.statusText);
      return;
    }

    const blob = await resp.blob();
    if (!blob || blob.size === 0) {
      console.warn("[voz] blob vacío");
      return;
    }

    const objectUrl = URL.createObjectURL(blob);

    const audio = new Audio(objectUrl);
    audio.volume = 0.9;
    currentAudio = audio;

    const cleanup = () => {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {}
      if (currentAudio === audio) {
        currentAudio = null;
      }
    };

    audio.addEventListener("ended", cleanup, { once: true });
    audio.addEventListener("error", cleanup, { once: true });

    await audio.play();
  } catch (err) {
    console.error("[voz] Error general en reproducirVozVaronil:", err);
  }
}
