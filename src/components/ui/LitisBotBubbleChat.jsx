import React, { useState, useRef, useEffect } from "react";
import {
  FaPaperclip,
  FaMicrophone,
  FaPaperPlane,
  FaVolumeUp,
  FaRegCopy,
  FaRegEdit,
  FaRegThumbsUp,
  FaRegThumbsDown,
} from "react-icons/fa";

/* =========================================================
   UTIL: Voz varonil desde backend (misma idea que tu TTS)
   ========================================================= */
async function reproducirVozServidor(textoPlano) {
  try {
    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

    const resp = await fetch(`${API_BASE}/voz`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        texto: textoPlano,
        voz: "masculina_profesional",
      }),
    });

    if (!resp.ok) {
      console.warn("⚠️ No se pudo generar voz:", resp.status);
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);

    audio.onended = () => {
      URL.revokeObjectURL(url);
    };

    audio.onerror = (e) => {
      console.error("🎧 Error al reproducir voz:", e);
      URL.revokeObjectURL(url);
    };

    audio.play().catch((e) => {
      console.error("🎧 Error al hacer play():", e);
      URL.revokeObjectURL(url);
    });
  } catch (err) {
    console.error("❌ Error en TTS burbuja:", err);
  }
}

/* =========================================================
   Mensaje del ASISTENTE dentro del bubble chat
   - Botonera funcional: voz, copiar, editar, like, dislike
   ========================================================= */
function MensajeBotBubble({ msg, onCopy, onEdit, onFeedback }) {
  const [editando, setEditando] = useState(false);
  const [editValue, setEditValue] = useState(msg.content || "");
  const [leyendo, setLeyendo] = useState(false);

  async function handleSpeak() {
    if (leyendo) return;
    try {
      setLeyendo(true);

      // limpiar HTML → texto plano
      const tmp = document.createElement("div");
      tmp.innerHTML = msg.content || "";
      const plainText =
        tmp.textContent || tmp.innerText || msg.content || "";

      await reproducirVozServidor(plainText);
    } finally {
      setLeyendo(false);
    }
  }

  function handleGuardar() {
    setEditando(false);
    onEdit && onEdit(editValue);
  }

  function handleCopiar() {
    // quitamos etiquetas HTML si las hubiera
    const tmp = document.createElement("div");
    tmp.innerHTML = msg.content || "";
    const plainText =
      tmp.textContent || tmp.innerText || msg.content || "";

    navigator.clipboard.writeText(plainText).catch(() => {});
  }

  return (
    <div
      className="flex flex-col w-full bg-yellow-50 text-[#5C2E0B] rounded-[1.5rem] shadow border-0 px-4 py-4"
      style={{
        maxWidth: "92%",
      }}
    >
      {!editando ? (
        <div
          className="leading-relaxed whitespace-pre-wrap break-words text-[16px] sm:text-[16px]"
          dangerouslySetInnerHTML={{ __html: msg.content }}
        />
      ) : (
        <div className="flex flex-col gap-2 w-full">
          <textarea
            className="w-full border border-yellow-300 rounded p-2 text-[15px] leading-relaxed"
            rows={4}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
          />
          <div className="flex gap-4 text-[15px]">
            <button
              className="text-green-700 font-semibold"
              onClick={handleGuardar}
            >
              Guardar
            </button>
            <button
              className="text-red-700"
              onClick={() => {
                setEditando(false);
                setEditValue(msg.content || "");
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {!editando && (
        <div className="flex flex-row flex-wrap items-center gap-4 mt-4 text-[18px]">
          {/* voz */}
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full"
            style={{
              background: "#5C2E0B",
              color: "#fff",
              opacity: leyendo ? 0.6 : 1,
            }}
            aria-label="Leer en voz alta"
            title="Leer en voz alta"
            disabled={leyendo}
            onClick={handleSpeak}
          >
            <FaVolumeUp size={16} />
          </button>

          {/* copiar */}
          <button
            className="text-[#5C2E0B]"
            onClick={handleCopiar}
            title="Copiar"
            aria-label="Copiar"
          >
            <FaRegCopy size={18} />
          </button>

          {/* editar */}
          <button
            className="text-[#5C2E0B]"
            onClick={() => setEditando(true)}
            title="Editar"
            aria-label="Editar"
          >
            <FaRegEdit size={18} />
          </button>

          {/* like */}
          <button
            className="text-green-700"
            onClick={() => onFeedback && onFeedback("up")}
            title="Respuesta útil"
            aria-label="Respuesta útil"
          >
            <FaRegThumbsUp size={18} />
          </button>

          {/* dislike */}
          <button
            className="text-red-700"
            onClick={() => onFeedback && onFeedback("down")}
            title="Respuesta no útil"
            aria-label="Respuesta no útil"
          >
            <FaRegThumbsDown size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Mensaje del USUARIO
   ========================================================= */
function MensajeUsuarioBubble({ texto }) {
  return (
    <div className="flex justify-end w-full">
      <div
        className="rounded-[1.5rem] shadow px-4 py-3 text-white text-[16px] leading-relaxed font-medium"
        style={{
          maxWidth: "88%",
          background: "#5C2E0B",
        }}
      >
        {texto}
      </div>
    </div>
  );
}

/* =========================================================
   Componente principal flotante LitisBotBubbleChat
   - Burbujita DRAGGABLE
   - Chat anclado a esa posición
   ========================================================= */
export default function LitisBotBubbleChat({ usuarioId, pro }) {
  // === estado chat interno ===
  const [openChat, setOpenChat] = useState(false); // ahora controlamos mostrar/ocultar chat
  const [input, setInput] = useState("");
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState([
    {
      role: "assistant",
      content:
        "Hola, soy LitisBot. ¿En qué puedo ayudarte hoy? 👋",
    },
  ]);

  // === refs para scroll del feed ===
  const feedRef = useRef(null);

  // === posición flotante de la burbuja (draggable) ===
  // guardamos top/left en px, relativos a la ventana
  const [bubblePos, setBubblePos] = useState(() => {
    // intentar leer posición previa
    try {
      const raw = localStorage.getItem("litisbot-bubble-pos");
      if (raw) {
        const { top, left } = JSON.parse(raw);
        return {
          top: top ?? 100,
          left: left ?? 100,
        };
      }
    } catch (_) {}
    return { top: 100, left: 100 };
  });

  // arrastre
  const draggingRef = useRef(false);
  const offsetRef = useRef({ x: 0, y: 0 });

  function handleMouseDown(e) {
    draggingRef.current = true;
    offsetRef.current = {
      x: e.clientX - bubblePos.left,
      y: e.clientY - bubblePos.top,
    };
    e.preventDefault();
  }

  function handleMouseMove(e) {
    if (!draggingRef.current) return;
    const newLeft = e.clientX - offsetRef.current.x;
    const newTop = e.clientY - offsetRef.current.y;

    // límites simples para que no se vaya muy fuera
    const clampedLeft = Math.min(
      Math.max(newLeft, 8),
      window.innerWidth - 200
    );
    const clampedTop = Math.min(
      Math.max(newTop, 8),
      window.innerHeight - 80
    );

    setBubblePos({ top: clampedTop, left: clampedLeft });
  }

  function handleMouseUp() {
    if (!draggingRef.current) return;
    draggingRef.current = false;

    // guardamos posición
    localStorage.setItem(
      "litisbot-bubble-pos",
      JSON.stringify(bubblePos)
    );
  }

  useEffect(() => {
    function stopDrag() {
      if (draggingRef.current) {
        draggingRef.current = false;
        localStorage.setItem(
          "litisbot-bubble-pos",
          JSON.stringify(bubblePos)
        );
      }
    }
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("mouseleave", stopDrag);
    return () => {
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("mouseleave", stopDrag);
    };
  }, [bubblePos]);

  // follow scroll al final del feed
  useEffect(() => {
    const el = feedRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [mensajes, openChat]);

  async function enviarMensaje() {
    if (!input.trim() || cargando) return;
    const pregunta = input.trim();
    setInput("");
    setCargando(true);

    // Pintamos mensaje usuario y placeholder "Espera un momento…"
    setMensajes((prev) => [
      ...prev,
      { role: "user", content: pregunta },
      { role: "assistant", content: "Espera un momento…" },
    ]);

    try {
      // llamada backend real
      const API_BASE =
        import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";

      const body = {
        prompt: pregunta,
        usuarioId: usuarioId || "invitado-burbuja",
        expedienteId: "burbuja",
        idioma: "es-PE",
        pais: "Perú",
      };

      const resp = await fetch(`${API_BASE}/ia/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await resp.json();

      // Reemplazar el último "Espera un momento…" con la respuesta real
      setMensajes((prev) => {
        const temp = [...prev];
        if (
          temp.length > 0 &&
          temp[temp.length - 1].role === "assistant" &&
          temp[temp.length - 1].content === "Espera un momento…"
        ) {
          temp.pop();
        }
        temp.push({
          role: "assistant",
          content: data?.respuesta || "No pude generar respuesta.",
        });
        return temp;
      });
    } catch (err) {
      console.error("❌ Error en burbuja:", err);

      setMensajes((prev) => {
        const temp = [...prev];
        if (
          temp.length > 0 &&
          temp[temp.length - 1].role === "assistant" &&
          temp[temp.length - 1].content === "Espera un momento…"
        ) {
          temp.pop();
        }
        temp.push({
          role: "assistant",
          content:
            "Hubo un problema procesando tu consulta. Intenta nuevamente en un momento.",
        });
        return temp;
      });
    } finally {
      setCargando(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviarMensaje();
    }
  }

  // helper para mobile fullscreen
  const isMobile = window.matchMedia("(max-width: 640px)").matches;

  /* ============================================
     RENDER
     ============================================ */

  return (
    <>
      {/* ============ BURBUJA DRAGGABLE ============ */}
      {!openChat && (
        <div
          // wrapper flotante independiente, con pointerEvents on
          style={{
            position: "fixed",
            top: bubblePos.top,
            left: bubblePos.left,
            zIndex: 9999,
            cursor: "grab",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          // si el user hace click (sin arrastrar) abrimos chat
          onClick={(e) => {
            // si estaba arrastrando no abrir de inmediato
            if (draggingRef.current) return;
            setOpenChat(true);
          }}
        >
          <div
            className="flex items-center gap-2 rounded-xl shadow-xl px-3 py-2 text-white"
            style={{
              backgroundColor: "#5C2E0B",
              minWidth: "140px",
              maxWidth: "200px",
            }}
          >
            {/* avatar LitisBot */}
            <div
              className="w-8 h-8 rounded-full overflow-hidden border border-white flex items-center justify-center text-[10px] font-bold"
              style={{
                backgroundColor: "#fff",
                color: "#5C2E0B",
              }}
            >
              {/* aquí puedes usar tu logo litisbot real */}
              <img
                src="/src/assets/litisbot-logo.png"
                alt="LitisBot"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-col leading-tight text-[13px]">
              <span className="font-semibold">LitisBot</span>
              <span className="opacity-90">
                ¿Necesitas ayuda?
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============ MINI CHAT (anclado a la burbuja en desktop, fullscreen en móvil) ============ */}
      {openChat && (
        <>
          {/* overlay táctil SOLO en mobile para dar experiencia modal */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/40 z-[9998]"
              onClick={() => setOpenChat(false)}
              style={{ touchAction: "none" }}
            />
          )}

          <div
            className={`
              fixed z-[9999] flex flex-col shadow-2xl border border-[#5C2E0B]/30 overflow-hidden
              bg-white rounded-[1rem]
            `}
            style={{
              // si es mobile => fullscreen tipo modal inferior
              ...(isMobile
                ? {
                    left: 0,
                    right: 0,
                    bottom: 0,
                    top: "20vh",
                    borderRadius: "1rem 1rem 0 0",
                  }
                : {
                    // desktop: anclado justo encima de la burbuja
                    top: bubblePos.top - 320 < 8 ? 8 : bubblePos.top - 320,
                    left:
                      bubblePos.left + 280 > window.innerWidth
                        ? window.innerWidth - 300
                        : bubblePos.left,
                    width: 300,
                    maxHeight: 320,
                  }),
            }}
          >
            {/* HEADER */}
            <div
              className="flex items-center justify-between px-3 py-2 text-white"
              style={{ background: "#5C2E0B" }}
            >
              <div className="flex items-center gap-2 text-white font-semibold text-[15px]">
                <div
                  className="w-9 h-9 rounded bg-white flex items-center justify-center overflow-hidden"
                  style={{
                    color: "#5C2E0B",
                    fontWeight: "bold",
                    fontSize: "11px",
                  }}
                >
                  <img
                    src="/src/assets/litisbot-logo.png"
                    alt="LitisBot"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col leading-tight">
                  <span>LitisBot</span>
                  <span className="text-[11px] font-normal opacity-80">
                    {pro ? "Acceso Pro" : "Asistencia básica"}
                  </span>
                </div>
              </div>

              <button
                className="text-white font-bold text-xl leading-none px-2"
                onClick={() => setOpenChat(false)}
                aria-label="Cerrar chat"
                title="Cerrar"
              >
                ×
              </button>
            </div>

            {/* FEED */}
            <div
              ref={feedRef}
              className="flex-1 min-h-0 w-full overflow-y-auto no-scrollbar px-3 py-3 bg-white"
              style={{
                backgroundColor: "#fff",
              }}
            >
              <div className="flex flex-col gap-3">
                {mensajes.map((m, idx) => {
                  if (m.role === "assistant") {
                    return (
                      <div
                        key={idx}
                        className="flex w-full justify-start text-[#5C2E0B]"
                      >
                        <MensajeBotBubble
                          msg={m}
                          onCopy={() => {
                            // copiar ya está dentro del propio bubble
                          }}
                          onEdit={(nuevo) => {
                            setMensajes((prev) => {
                              const clone = [...prev];
                              clone[idx] = {
                                ...clone[idx],
                                content: nuevo,
                              };
                              return clone;
                            });
                          }}
                          onFeedback={(tipo) => {
                            console.log(
                              "feedback burbuja",
                              tipo
                            );
                          }}
                        />
                      </div>
                    );
                  } else {
                    return (
                      <MensajeUsuarioBubble
                        key={idx}
                        texto={m.content}
                      />
                    );
                  }
                })}

                {cargando && (
                  <div className="flex w-full justify-start">
                    <div
                      className="rounded-[1.5rem] bg-yellow-50 text-[#5C2E0B] border-0 px-4 py-3 shadow text-[15px]"
                      style={{ maxWidth: "80%" }}
                    >
                      Procesando…
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* INPUT BAR */}
            <div
              className="flex items-end gap-2 border-t border-yellow-300 bg-[#fff8e1] px-3 py-2"
              style={{ flexShrink: 0 }}
            >
              {/* Adjuntar archivo (placeholder futuro) */}
              <button
                className="flex items-center justify-center rounded-full w-9 h-9 text-white"
                style={{
                  background: "#5C2E0B",
                }}
                title="Adjuntar archivo"
              >
                <FaPaperclip size={16} />
              </button>

              {/* textarea */}
              <textarea
                className="flex-1 bg-transparent outline-none border-0 resize-none text-[15px] leading-relaxed text-[#5C2E0B] max-h-[120px] overflow-y-auto"
                placeholder="Escribe o dicta tu pregunta legal…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                style={{
                  minHeight: "36px",
                }}
              />

              {/* micrófono (placeholder) */}
              <button
                className="flex items-center justify-center rounded-full w-9 h-9 text-white"
                style={{
                  background: "#5C2E0B",
                }}
                title="Dictado por voz"
              >
                <FaMicrophone size={16} />
              </button>

              {/* enviar */}
              <button
                className={`flex items-center justify-center rounded-full w-9 h-9 text-white ${
                  !input.trim() || cargando
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
                style={{
                  background: "#5C2E0B",
                }}
                disabled={!input.trim() || cargando}
                onClick={enviarMensaje}
                title="Enviar"
              >
                <FaPaperPlane size={16} />
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

/* extra util CSS global (déjalo donde ya tienes .no-scrollbar):
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
*/
